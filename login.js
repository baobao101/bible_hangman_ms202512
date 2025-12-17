// 1. Initialize Supabase
const _supabase = supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

// 2. Login Function
async function signInWithGoogle() {
  const { data, error } = await _supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin // Returns user to your game after login
    }
  });
  
  if (error) console.error('Login failed:', error.message);
}

// 3. Logout Function
async function logout() {
  await _supabase.auth.signOut();
  window.location.reload();
}

// 4. Check if user is already logged in on page load
async function checkUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  
  if (user) {
    console.log('Logged in as:', user.email);
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('player-name').innerText = `Player: ${user.user_metadata.full_name}`;
    // Load their scores here
  }
}

checkUser();

async function saveScore(finalScore) {
  const { data: { user } } = await _supabase.auth.getUser();

  if (!user) {
    alert("Log in to save your score!");
    return;
  }

  const { error } = await _supabase
    .from('leaderboard')
    .insert([
      { 
        user_id: user.id, 
        username: user.user_metadata.full_name, 
        score: finalScore 
      }
    ]);

  if (error) console.error('Error saving score:', error);
  else alert("Score saved to leaderboard!");
}
async function fetchLeaderboard() {
  const scoreList = document.getElementById('score-list');

  // 1. Fetch data from Supabase
  const { data, error } = await _supabase
    .from('leaderboard')
    .select('username, score')
    .order('score', { ascending: false }) // Highest score first
    .limit(10); // Only get the top 10

  if (error) {
    console.error('Error fetching leaderboard:', error);
    scoreList.innerHTML = '<li>Error loading scores.</li>';
    return;
  }

  // 2. Clear current list
  scoreList.innerHTML = '';

  // 3. Loop through data and create list items
  if (data.length === 0) {
    scoreList.innerHTML = '<li>No scores yet. Be the first!</li>';
  } else {
    data.forEach((entry, index) => {
      const li = document.createElement('li');
      // Add a little trophy for the winner!
      const rank = index === 0 ? '🏆' : `#${index + 1}`;
      li.innerHTML = `<strong>${rank} ${entry.username}:</strong> ${entry.score}`;
      scoreList.appendChild(li);
    });
  }
}

// Call this function when the page loads
fetchLeaderboard();
async function getTopScores() {
  const { data, error } = await _supabase
    .from('leaderboard')
    .select('username, score')
    .order('score', { ascending: false })
    .limit(10);

  if (data) {
    console.table(data); // This is your shared leaderboard data
  }
}
async function uploadScore(playerScore) {
  // Get the logged in user
  const { data: { user } } = await _supabase.auth.getUser();

  if (user) {
    const { error } = await _supabase
      .from('leaderboard')
      .insert([
        { 
          username: user.user_metadata.full_name, 
          score: playerScore,
          user_id: user.id 
        }
      ]);

    if (error) console.error("Error saving score:", error);
    else console.log("Score saved!");
  }
}
async function fetchPersonalBest() {
  const pbElement = document.getElementById('pb-score');
  
  // 1. Get the current user
  const { data: { user } } = await _supabase.auth.getUser();

  if (!user) {
    pbElement.innerText = "Log in to see PB";
    return;
  }

  // 2. Query only this user's scores
  const { data, error } = await _supabase
    .from('leaderboard')
    .select('score')
    .eq('user_id', user.id) // Filter by the user's unique ID
    .order('score', { ascending: false })
    .limit(1); // We only need their highest single score

  if (error) {
    console.error("Error fetching PB:", error);
    return;
  }

  // 3. Update the UI
  if (data && data.length > 0) {
    pbElement.innerText = `${data[0].score} pts`;
  } else {
    pbElement.innerText = "No scores yet!";
  }
}

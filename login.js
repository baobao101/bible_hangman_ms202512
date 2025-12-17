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

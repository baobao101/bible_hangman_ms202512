// --- CONFIGURATION & DOM ELEMENTS ---
const HINT_COST = 10;
const INITIAL_SCORE = 100;
const MAX_GUESSES = 6;
const DATAMUSE_API_BASE = 'https://api.datamuse.com/words';
const MAX_HINTS_TO_SHOW = 4;
const HISTORY_SIZE = 100;

// Get DOM elements
const scoreDisplay = document.getElementById('score-display');
const hintButton = document.getElementById('hint-button');
const hintDisplay = document.getElementById('hint-display');
const guessesLeftDisplay = document.getElementById('guesses-left-display');
const lettersContainer = document.getElementById('letter-buttons');
const wordDisplay = document.getElementById('word-display');
const messageArea = document.getElementById('game-message');
const hangmanImage = document.getElementById('hangman-image');
// --- GAME STATE VARIABLES ---
let currentScore;
let guessesLeft;
let selectedWord = "";
let guessedLetters = [];
let displayedWord = [];
let wordsHistory = [];     // Array to hold recently played words
let wordList = [];         // NEW: Array to hold all words from the JSON file

// --- CORE UTILITIES ---

/**
 * Loads the word history from Local Storage.
 */
function loadWordHistory() {
    const savedHistory = localStorage.getItem('hangmanWordHistory');
    if (savedHistory) {
        // Words are stored as strings in JSON.parse
        wordsHistory = JSON.parse(savedHistory);
    } else {
        wordsHistory = [];
    }
}

/**
 * Saves the newly played word to the history, enforcing the size limit.
 * @param {string} word - The word just played.
 */
function saveWordToHistory(word) {
    const wordUpper = word.toUpperCase();

    // 1. Remove the word if it already exists in history (to push it to the front)
    wordsHistory = wordsHistory.filter(w => w !== wordUpper);

    // 2. Add the new word to the front of the array
    wordsHistory.unshift(wordUpper);

    // 3. Enforce the size limit (keep only the last 100 words)
    if (wordsHistory.length > HISTORY_SIZE) {
        wordsHistory = wordsHistory.slice(0, HISTORY_SIZE);
    }

    // 4. Save the updated array to Local Storage
    localStorage.setItem('hangmanWordHistory', JSON.stringify(wordsHistory));
}

/**
 * Loads the main word list from the external JSON file.
 */
async function loadWordList() {
    try {
        const response = await fetch('bible_words.json');
        if (!response.ok) {
            // If the file is missing or not reachable
            throw new Error(`Failed to load bible_words.json: ${response.status}`);
        }

        // Assuming bible_words.json is an array of strings: ["MOSES", "JUDAS", ...]
        const data = await response.json();

        // Store words in uppercase for consistency
        wordList = data.map(word => word.toUpperCase());

        console.log(`Loaded ${wordList.length} words.`);

    } catch (error) {
        console.error("Error loading word list. Using fallback words.", error);

        // Failsafe: Use a few hardcoded words if the file fails to load
        wordList = ["MOSES", "JUDAS", "GOLIATH", "EDEN", "NOAH", "JERUSALEM",
            "ABRAHAM", "ISAAC", "SAMSON", "DAVID", "MARY", "PETER",
            "PAUL", "ADAM", "EVE", "ANGEL", "TEMPLE", "CROSS",
            "MANGER", "SHEPERD", "EXODUS", "GENESIS", "HEAVEN",
            "JONAH", "JOB", "REVELATION"];
    }

    // Now that words are loaded, start the game
    startGame();
}

/**
 * Selects a new word, ensuring it has not been played recently.
 */
function selectNewWord() {
    if (wordList.length === 0) {
        console.error("Word list is empty. Cannot select a new word.");
        return;
    }

    let newWord;
    let attempts = 0;
    const maxAttempts = wordList.length * 2;

    do {
        // 1. Pick a random index
        const randomIndex = Math.floor(Math.random() * wordList.length);
        newWord = wordList[randomIndex];
        attempts++;

        // 2. Check if the word is in the recent history
        if (!wordsHistory.includes(newWord.toUpperCase())) {
            break; // Found a valid word!
        }

        if (attempts >= maxAttempts) {
            // Failsafe: If we run out of unique words, reset history to allow repetition
            console.warn("Ran out of unique words in the history pool. Clearing history.");
            wordsHistory = [];
            break;
        }

    } while (true);

    selectedWord = newWord;

    // Initialize the displayed word with blanks
    displayedWord = Array(selectedWord.length).fill('_');
    renderWordDisplay();
}

// --- SCORE AND UI FUNCTIONS (Unchanged) ---

function initializeScore() {
    const savedScore = localStorage.getItem('hangmanScore');

    if (savedScore !== null) {
        currentScore = parseInt(savedScore, 10);
    } else {
        currentScore = INITIAL_SCORE;
    }
    updateScoreDisplay();
}

function updateScore(newScore) {
    currentScore = newScore;
    updateScoreDisplay();
    localStorage.setItem('hangmanScore', currentScore);
}

function updateScoreDisplay() {
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${currentScore}`;
    }
}

// --- HINT API (DATAMUSE) LOGIC (Unchanged) ---

async function fetchHint(word) {
    const apiUrl = `${DATAMUSE_API_BASE}?ml=${word.toLowerCase()}&max=${MAX_HINTS_TO_SHOW}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            return "Sorry, word is too biblical. This is the hint!";
        }

        const hintWords = data.map(item => item.word);
        return `Related concepts: ${hintWords.join(', ')}`;

    } catch (error) {
        console.error("Could not fetch Datamuse hint:", error);
        return "Hint service unavailable. Try guessing!";
    }
}

async function handleHintRequest() {
    if (!selectedWord) return;

    if (currentScore < HINT_COST) {
        hintDisplay.textContent = `Not enough points (${HINT_COST} required) for a hint... Go PRO with 900 bonus points and 7,000 more words!`;
        return;
    }

    hintButton.disabled = true;
    hintButton.textContent = "Loading Hint...";

    const newScore = currentScore - HINT_COST;
    updateScore(newScore);

    const hintText = await fetchHint(selectedWord);

    hintDisplay.textContent = `Hint: ${hintText}`;

    hintButton.textContent = "Hint Used";
}

// --- CORE HANGMAN MECHANICS (Unchanged) ---

function renderWordDisplay() {
    if (wordDisplay) {
        wordDisplay.textContent = displayedWord.join(' ');
    }
}

function createLetterButtons() {
    if (!lettersContainer) return;

    lettersContainer.innerHTML = '';

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-';

    for (const letter of alphabet) {
        const button = document.createElement('button');

        button.textContent = letter;
        button.id = `btn-${letter}`;
        button.className = 'letter-button';

        button.addEventListener('click', () => handleGuess(letter, button));

        lettersContainer.appendChild(button);
    }
}

function updateHangmanImage() {
    const imageNumber = MAX_GUESSES - guessesLeft;

    if (hangmanImage) {
        // Note: hangmanImage is the <img> element inside the hangman-drawing div
        hangmanImage.src = `images/hangman-${imageNumber}.png`;
        hangmanImage.alt = `Hangman image showing ${imageNumber} wrong guesses.`;
    }
}


function handleGuess(letter, button) {
    if (guessedLetters.includes(letter) || guessesLeft <= 0) return;

    button.disabled = true;
    guessedLetters.push(letter);

    const wordUpper = selectedWord.toUpperCase();
    let isCorrect = false;

    for (let i = 0; i < wordUpper.length; i++) {
        if (wordUpper[i] === letter) {
            displayedWord[i] = letter;
            isCorrect = true;
        }
    }

    if (isCorrect) {
        button.classList.add('correct');
        renderWordDisplay();

        if (!displayedWord.includes('_')) {
            endGame(true);
        }
    } else {
        button.classList.add('incorrect');

        guessesLeft--;
        if (guessesLeftDisplay) {
            guessesLeftDisplay.textContent = `Guesses: ${guessesLeft}`;
        }

        updateHangmanImage();

        if (guessesLeft <= 0) {
            endGame(false);
        }
    }
}

/**
 * Ends the game and displays the result.
 * @param {boolean} win - True if the player won, false otherwise.
 */
function endGame(win) {
    // Disable all letter buttons
    document.querySelectorAll('.letter-button').forEach(btn => btn.disabled = true);

    // Save the word that was just played to the history array
    saveWordToHistory(selectedWord);

    if (win) {
        // 📿 NEW: Increment score by 5 for a win
        const bonus = 5;
        updateScore(currentScore + bonus);

        messageArea.textContent = `👼 You Won! +${bonus} points! Starting a new round...`;
        messageArea.classList.remove('error');
    } else {
        messageArea.textContent = `👿 Game Over! The word was: ${selectedWord}`;
        messageArea.classList.add('error');
        // You can optionally deduct points for a loss here, e.g., updateScore(currentScore - 2);
    }

    // Auto-start new game after a delay
    setTimeout(startGame, 5000);
}

function startGame() {
    // Only run if the word list is loaded. If not, loadWordList() handles the first call.
    if (wordList.length === 0) {
        console.warn("Word list not yet loaded. Aborting game start.");
        return;
    }

    messageArea.textContent = "";
    messageArea.classList.remove('error');

    // Reset game state
    guessedLetters = [];
    guessesLeft = MAX_GUESSES;

    // Reset UI Elements
    if (hintDisplay) hintDisplay.textContent = "";
    if (hintButton) {
        hintButton.disabled = false;
        hintButton.textContent = `Get Hint (${HINT_COST} points)`;
    }

    if (guessesLeftDisplay) {
        guessesLeftDisplay.textContent = `Guesses: ${guessesLeft}`;
    }

    updateHangmanImage();

    // Reset button states and remove colors
    document.querySelectorAll('.letter-button').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });

    // Select the new word and render the display
    selectNewWord();
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Score and History (Synchronous)
    initializeScore();
    loadWordHistory();

    // 2. Create the keyboard buttons (Synchronous)
    createLetterButtons();

    // 3. Attach the click handler to the hint button (Synchronous)
    if (hintButton) {
        hintButton.addEventListener('click', handleHintRequest);
    }

    // 4. Load the Word List ASYNCHRONOUSLY, which calls startGame() upon success
    loadWordList();
});
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

  if (!user) return;

  // .upsert will look for a row where 'user_id' matches
  const { error } = await _supabase
    .from('leaderboard')
    .upsert({ 
        user_id: user.id, 
        username: user.user_metadata.full_name, 
        score: finalScore 
      }, 
      { onConflict: 'user_id' } // Tell it to watch for duplicate user_ids
    );

  if (error) console.error('Error saving score:', error);
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
      li.classList.add('new-entry-animation');
      // Add a little trophy for the winner!
      li.innerHTML = `<strong>#${index + 1} ${entry.username}:</strong> ${entry.score}`;
    //  const rank = index === 0 ? '🏆' : `#${index + 1}`;
  //    li.innerHTML = `<strong>${rank} ${entry.username}:</strong> ${entry.score}`;
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
async function handleGameOver(currentSessionScore) {
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  // Save the new score first
  await uploadScore(currentSessionScore);

  // Check if this is a new PB
  const { data } = await _supabase
    .from('leaderboard')
    .select('score')
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(1);

  // If this session is higher than the previous top score (or if it's the first)
  if (!data[0] || currentSessionScore >= data[0].score) {
    alert("🔥 NEW PERSONAL BEST!");
  }

  // Refresh the whole leaderboard UI
  fetchPersonalBest();
  fetchLeaderboard();
}
// This function starts the live listener
function startLiveLeaderboard() {
  _supabase
    .channel('public:leaderboard') // Create a channel
    .on(
      'postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'leaderboard' }, 
      (payload) => {
        console.log('New score received!', payload.new);
        
        // Refresh the list automatically when a new score is saved
        fetchLeaderboard();
      }
    )
    .subscribe();
}

// Start listening when the game loads
startLiveLeaderboard();
async function saveHighScore(currentScore) {
  const { data: { user } } = await _supabase.auth.getUser();
  
  const { error } = await _supabase.rpc('update_high_score', { 
    new_score: currentScore,
    p_username: user.user_metadata.full_name
  });

  if (error) console.error(error);
}

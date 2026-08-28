/* ==========================================================
   THE MUSIC PLAYER
   Centre button = play / pause.  Left / right = previous / next.

   To add a song: drop the mp3 in the music folder, then add one
   line to the list below (the file, and the title to show).
   ========================================================== */
(() => {
  const SONGS = [
    { file: "../music/song 1.mp3", title: "Song 1" },
  ];

  // How loud, from 0 (silent) to 1 (full). Tune to taste.
  const VOLUME = 0.4;

  const root = document.getElementById("ipod");
  if (!root) return;

  let current = 0; // which song in the list is loaded

  const audio = new Audio(SONGS[current].file);
  audio.volume = VOLUME;

  const title = document.getElementById("ipod-title");
  const fill  = document.getElementById("ipod-fill");
  const star  = document.getElementById("pixel-anim");
  title.textContent = SONGS[current].title;

  // As the song plays, grow the bar to match how far in we are.
  audio.addEventListener("timeupdate", () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    fill.style.width = pct + "%";
  });

  // Load a song by its place in the list (wraps around both ways).
  function load(i) {
    current = (i + SONGS.length) % SONGS.length;
    audio.src = SONGS[current].file;
    title.textContent = SONGS[current].title;
    fill.style.width = "0%";
    audio.play();
  }

  // Centre button: play / pause.
  const playBtn = root.querySelector(".ipod-play");
  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  // While playing, the drawn circle stays flipped and the pixels dance.
  audio.addEventListener("play", () => {
    playBtn.classList.add("pressed");
    if (star) star.style.display = "block";
  });
  audio.addEventListener("pause", () => {
    playBtn.classList.remove("pressed");
    if (star) star.style.display = "none";
  });

  // Previous / next. With one song they just restart it.
  root.querySelector(".ipod-prev").addEventListener("click", () => load(current - 1));
  root.querySelector(".ipod-next").addEventListener("click", () => load(current + 1));

  // When a song finishes, move on to the next (loops the list forever).
  audio.addEventListener("ended", () => load(current + 1));
})();

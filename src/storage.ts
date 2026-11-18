// Keys of what the app keeps in the browser (localStorage). The app used to be
// called Fretly: a value still saved under the old "fretly." prefix moves to the
// new key the first time a page asks for it, so nobody loses progress or settings.

const PREFIX = "guitar-workouts.";
const OLD_PREFIX = "fretly.";

export function storageKey(name: string) {
  const key = PREFIX + name;
  try {
    const old = window.localStorage.getItem(OLD_PREFIX + name);
    if (old !== null) {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, old);
      window.localStorage.removeItem(OLD_PREFIX + name);
    }
  } catch {
    // Blocked storage: nothing to move.
  }
  return key;
}

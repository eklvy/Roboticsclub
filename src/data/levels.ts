export const levels = [
  {
    name: "SYSTEM BOOT",
    place: "Robotics control room",
    difficulty: "EASY",
    sector: "A–01",
    color: "#00e5ff",
    story:
      "You wake to the hum of emergency power. The control room is dark. A single terminal is still listening. Bring the system back online.",
    fragment: "Access frequency",
  },
  {
    name: "THE CODE VAULT",
    place: "Digital security vault",
    difficulty: "MODERATE",
    sector: "B–02",
    color: "#8b5cf6",
    story:
      "Behind the vault door lies the emergency power key. ORION has wrapped it in three layers of encryption. Every signal has a meaning.",
    fragment: "Power key",
  },
  {
    name: "CIRCUIT BREAKER",
    place: "Electrical maintenance",
    difficulty: "MEDIUM",
    sector: "C–03",
    color: "#ffd166",
    story:
      "A severed grid stands between you and the security doors. Route the current, isolate the fault, and bring the relays online.",
    fragment: "Relay order",
  },
  {
    name: "ROBOT NAVIGATION",
    place: "Autonomous testing arena",
    difficulty: "HARD",
    sector: "D–04",
    color: "#39ff88",
    story:
      "Human access is sealed. Your maintenance drone can still fit through the service ducts. Guide it through ORION’s test arena.",
    fragment: "Drone signature",
  },
  {
    name: "AI OVERRIDE",
    place: "Central intelligence",
    difficulty: "VERY HARD",
    sector: "E–05",
    color: "#ff3b5c",
    story:
      "ORION is rewriting its own security rules. Find the intrusion in its logs, reconstruct the trust chain, and reclaim the terminal.",
    fragment: "Root authorization",
  },
  {
    name: "THE FINAL ESCAPE",
    place: "Central reactor chamber",
    difficulty: "EXPERT",
    sector: "F–06",
    color: "#eaf4ff",
    story:
      "The core knows you are here. Assemble everything you have recovered. Disconnect ORION before the reactor seals your only way out.",
    fragment: "Freedom",
  },
];
export const puzzles = [
  {
    title: "Find the boot frequency",
    kind: "text",
    brief:
      "The emergency oscillator repeats a growing pattern. Enter the missing frequency.",
    label: "NEXT FREQUENCY",
    clue: "2   /   6   /   12   /   20   /   30   /   ?",
  },
  {
    title: "Read between the logs",
    kind: "logs",
    brief:
      "The diagnostic initials carry the engineer’s recovery password. Read the highlighted letters from top to bottom.",
    label: "RECOVERY PASSWORD",
  },
  {
    title: "Restore terminal access",
    kind: "keypad",
    brief:
      "Enter a four-digit code: the boot frequency followed by the number of letters in the recovery password, padded to two digits.",
    label: "ACCESS CODE",
  },
  {
    title: "Translate the signal",
    kind: "binary",
    brief:
      "Each group of eight bits is one ASCII character. Use the byte converter to recover the power key.",
    label: "DECODED WORD",
    clue: "01010000 01001111 01010111 01000101 01010010",
  },
  {
    title: "Listen to the darkness",
    kind: "morse",
    brief:
      "The service beacon transmits a three-letter distress signal. Decode it to synchronize the vault.",
    label: "BEACON MESSAGE",
    clue: "···   −−−   ···",
  },
  {
    title: "Unwind the cipher",
    kind: "cipher",
    brief:
      "ORION moved every letter three positions forward. Rotate the alphabet back to recover the command.",
    label: "DECRYPTED COMMAND",
    clue: "RSHQ",
  },
  {
    title: "Bridge the broken grid",
    kind: "circuit",
    brief:
      "Rotate the nine conduits. Connect the source at the top of the first tile to the output below the last tile. All nine tiles must carry current.",
    label: "POWER ROUTING",
  },
  {
    title: "Isolate the failed component",
    kind: "fault",
    brief:
      "Source voltage is 12 V. A healthy series element has a small voltage drop. An open component takes the entire supply. Select the failed component.",
    label: "FAULT ISOLATION",
  },
  {
    title: "Bring the relays online",
    kind: "switches",
    brief:
      "Coolant (C) must start first. Ground (A) follows coolant. Load (D) requires ground. Bus (B) must be last. Activate all four in order.",
    label: "RELAY SEQUENCE",
  },
  {
    title: "Guide the maintenance drone",
    kind: "maze",
    brief:
      "Reach the green extraction tile. Walls block movement. Use the arrow keys or touch controls to guide your drone.",
    label: "MANUAL NAVIGATION",
  },
  {
    title: "Program a safe route",
    kind: "queue",
    brief:
      "Build a command queue that takes the drone from the dock to extraction. The entire queue must be valid. Execute when ready.",
    label: "COMMAND PROGRAMMING",
  },
  {
    title: "Cross the laser field",
    kind: "laser",
    brief:
      "The red row pulses on and off. Cross only while it is dark. A hit returns the drone to its dock and costs points. Reach extraction.",
    label: "LIVE NAVIGATION",
  },
  {
    title: "Trace the intrusion",
    kind: "investigate",
    brief:
      "Routine services use signed commands. Select the first unsigned command that elevated permissions and triggered the lockdown.",
    label: "FORENSIC ANALYSIS",
  },
  {
    title: "Reconstruct the trust chain",
    kind: "logic",
    brief:
      "Restore the protocols in dependency order. AUTH must precede all others. AUDIT follows AUTH. ISOLATE requires AUDIT. RESTORE must be last.",
    label: "OVERRIDE SEQUENCE",
  },
  {
    title: "Take back the terminal",
    kind: "terminal",
    brief:
      "Use help to inspect the command set. Authenticate with the recovered power key, isolate ORION, then restore access.",
    label: "SECURE SHELL",
  },
  {
    title: "Reassemble the access fragments",
    kind: "fragments",
    brief:
      "Arrange the five recovered fragments in facility order: control room → vault → maintenance → arena → AI core.",
    label: "FRAGMENT ASSEMBLY",
  },
  {
    title: "Authorize the master override",
    kind: "text",
    brief:
      "Combine the control-room frequency, vault power key, and maintenance relay order with hyphens. Your field journal contains the recovered fragments.",
    label: "MASTER OVERRIDE",
    clue: "FREQUENCY — POWER KEY — RELAY ORDER",
  },
  {
    title: "Release the emergency hatch",
    kind: "final",
    brief:
      "Arm the escape mechanism, then activate the four relays in the recovered maintenance order within 12 seconds. You can re-arm if the window expires.",
    label: "EMERGENCY RELEASE",
  },
];
export const MAZE = [
  "...#..",
  "##.#.#",
  "...#..",
  ".###.#",
  "......",
  "####..",
];
export const PROGRAM_MAZE = [
  "....##",
  "###.##",
  "#...##",
  "#.####",
  "#.....",
  "#####.",
];
export const LASER_MAZE = [
  "......",
  ".##.#.",
  "......",
  ".#.##.",
  "......",
  "......",
];
export const DIRECTIONS: Record<string, [number, number]> = {
  U: [0, -1],
  R: [1, 0],
  D: [0, 1],
  L: [-1, 0],
};

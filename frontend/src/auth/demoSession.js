import { isDemoMode } from "./runtime";

const SESSION_KEY = "dormdesk.demo.session";
const ACCOUNTS_KEY = "dormdesk.demo.accounts";

const DEFAULT_ACCOUNTS = [
  {
    email: "admin@gmail.com",
    password: "Admin@123",
    name: "DormDesk Admin",
    groups: ["SuperAdmin"],
    sub: "demo-super-admin",
  },
  {
    email: "roomadmin@gmail.com",
    password: "RoomAdmin@123",
    name: "Room Admin",
    groups: ["RoomAdmin"],
    sub: "demo-room-admin",
  },
  {
    email: "foodadmin@gmail.com",
    password: "FoodAdmin@123",
    name: "Food Admin",
    groups: ["FoodAdmin"],
    sub: "demo-food-admin",
  },
  {
    email: "wateradmin@gmail.com",
    password: "WaterAdmin@123",
    name: "Water Admin",
    groups: ["WaterAdmin"],
    sub: "demo-water-admin",
  },
  {
    email: "electricaladmin@gmail.com",
    password: "ElectricalAdmin@123",
    name: "Electrical Admin",
    groups: ["ElectricalAdmin"],
    sub: "demo-electrical-admin",
  },
  {
    email: "cleaningadmin@gmail.com",
    password: "CleaningAdmin@123",
    name: "Cleaning Admin",
    groups: ["CleaningAdmin"],
    sub: "demo-cleaning-admin",
  },
  {
    email: "student@gmail.com",
    password: "Student@123",
    name: "Demo Student",
    groups: ["Students"],
    sub: "demo-student-1",
  },
];

function readJson(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeededAccounts() {
  const storedAccounts = readJson(ACCOUNTS_KEY, null);
  if (storedAccounts) {
    return storedAccounts;
  }

  writeJson(ACCOUNTS_KEY, DEFAULT_ACCOUNTS);
  return DEFAULT_ACCOUNTS;
}

export function getDemoSession() {
  return readJson(SESSION_KEY, null);
}

export function setDemoSession(session) {
  writeJson(SESSION_KEY, session);
}

export function clearDemoSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export async function demoSignIn({ username, password }) {
  const accounts = ensureSeededAccounts();
  const account = accounts.find(
    (entry) =>
      entry.email.toLowerCase() === username.toLowerCase() &&
      entry.password === password,
  );

  if (!account) {
    throw {
      name: "NotAuthorizedException",
      message: "Incorrect username or password",
    };
  }

  const session = {
    email: account.email,
    name: account.name,
    sub: account.sub,
    groups: account.groups,
  };

  setDemoSession(session);

  return {
    isSignedIn: true,
    nextStep: null,
    session,
    groups: account.groups,
    userId: account.sub,
  };
}

export async function demoSignUp({ username, password, options }) {
  const accounts = ensureSeededAccounts();
  const email = username.trim().toLowerCase();

  if (accounts.some((entry) => entry.email.toLowerCase() === email)) {
    throw new Error("An account with this email already exists.");
  }

  const nextIndex =
    accounts.filter((entry) => entry.groups.includes("Students")).length + 1;
  const account = {
    email,
    password,
    name: options?.userAttributes?.name || email,
    groups: ["Students"],
    sub: `demo-student-${nextIndex}`,
  };

  accounts.push(account);
  writeJson(ACCOUNTS_KEY, accounts);

  return { isSignUpComplete: true };
}

export async function demoConfirmSignUp() {
  return { isSignUpComplete: true };
}

export async function demoSignOut() {
  clearDemoSession();
}

export function buildDemoHeaders() {
  if (!isDemoMode) {
    return {};
  }

  const session = getDemoSession();
  if (!session) {
    return {};
  }

  return {
    "X-Demo-User-Email": session.email,
    "X-Demo-User-Name": session.name,
    "X-Demo-User-Sub": session.sub,
    "X-Demo-User-Groups": session.groups.join(","),
  };
}

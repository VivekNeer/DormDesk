import { createContext, useContext, useState, useEffect } from "react";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignUp,
} from "./cognito";
import { isDemoMode } from "./runtime";
import {
  demoSignIn,
  demoSignUp,
  demoConfirmSignUp,
  demoSignOut,
  getDemoSession,
} from "./demoSession";

const AuthContext = createContext(null);

// Maps Cognito group names → category values
const GROUP_TO_CATEGORY = {
  FoodAdmin: "food",
  WaterAdmin: "water",
  RoomAdmin: "room",
  ElectricalAdmin: "electrical",
  CleaningAdmin: "cleaning",
};
const CATEGORY_ADMIN_GROUPS = Object.keys(GROUP_TO_CATEGORY);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      if (isDemoMode) {
        const session = getDemoSession();

        if (!session) {
          setUser(null);
          setGroups([]);
          return;
        }

        setUser({
          username: session.email,
          userId: session.sub,
          email: session.email,
          name: session.name,
        });
        setGroups(session.groups || []);
        return;
      }

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const userGroups = idToken?.payload?.["cognito:groups"] || [];

      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: idToken?.payload?.email || "",
        name: idToken?.payload?.name || "",
      });
      setGroups(userGroups);
    } catch {
      // Not authenticated
      setUser(null);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email, password) {
    if (isDemoMode) {
      const result = await demoSignIn({ username: email, password });

      setUser({
        username: result.session.email,
        userId: result.session.sub,
        email: result.session.email,
        name: result.session.name,
      });
      setGroups(result.session.groups);

      return { isSignedIn: true, groups: result.session.groups };
    }

    const result = await signIn({ username: email, password });

    if (result.isSignedIn) {
      // Fetch session to get groups
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const userGroups = idToken?.payload?.["cognito:groups"] || [];
      const currentUser = await getCurrentUser();

      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: idToken?.payload?.email || email,
        name: idToken?.payload?.name || "",
      });
      setGroups(userGroups);

      return { isSignedIn: true, groups: userGroups };
    }

    return result;
  }

  async function register(email, password, name) {
    if (isDemoMode) {
      return demoSignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });
    }

    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
        },
      },
    });
    return result;
  }

  async function confirmRegistration(email, code) {
    if (isDemoMode) {
      return demoConfirmSignUp(email, code);
    }

    const result = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });
    return result;
  }

  async function logout() {
    if (isDemoMode) {
      await demoSignOut();
    } else {
      await signOut();
    }
    setUser(null);
    setGroups([]);
  }

  const isCategoryAdmin = groups.some((g) => CATEGORY_ADMIN_GROUPS.includes(g));
  const adminCategory = groups.reduce(
    (cat, g) => cat || GROUP_TO_CATEGORY[g] || null,
    null,
  );
  const isSuperAdmin = groups.includes("SuperAdmin");
  // isStudent = authenticated and not any kind of admin
  const isStudent = !isSuperAdmin && !isCategoryAdmin;

  const value = {
    user,
    groups,
    isLoading,
    login,
    register,
    confirmRegistration,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin,
    isStudent,
    isCategoryAdmin,
    adminCategory,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;

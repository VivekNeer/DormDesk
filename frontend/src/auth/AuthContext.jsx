import { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp } from './cognito';

const AuthContext = createContext(null);

// Maps Cognito group names → category values
const GROUP_TO_CATEGORY = {
  FoodAdmin: 'food',
  WaterAdmin: 'water',
  RoomAdmin: 'room',
  ElectricalAdmin: 'electrical',
  CleaningAdmin: 'cleaning',
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
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const userGroups = idToken?.payload?.['cognito:groups'] || [];

      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: idToken?.payload?.email || '',
        name: idToken?.payload?.name || '',
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
    const result = await signIn({ username: email, password });

    if (result.isSignedIn) {
      // Fetch session to get groups
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const userGroups = idToken?.payload?.['cognito:groups'] || [];
      const currentUser = await getCurrentUser();

      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: idToken?.payload?.email || email,
        name: idToken?.payload?.name || '',
      });
      setGroups(userGroups);

      return { isSignedIn: true, groups: userGroups };
    }

    return result;
  }

  async function register(email, password, name) {
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
    const result = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });
    return result;
  }

  async function logout() {
    await signOut();
    setUser(null);
    setGroups([]);
  }

  const isCategoryAdmin = groups.some(g => CATEGORY_ADMIN_GROUPS.includes(g));
  const adminCategory = groups.reduce((cat, g) => cat || GROUP_TO_CATEGORY[g] || null, null);
  const isSuperAdmin = groups.includes('SuperAdmin');
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

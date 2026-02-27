import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const api = axios.create({ baseURL: '/api' });

// Attach Cognito ID Token to every request
api.interceptors.request.use(async cfg => {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});
export default api;
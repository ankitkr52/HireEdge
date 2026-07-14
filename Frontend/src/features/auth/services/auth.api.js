import axios from 'axios'

const BASE_URL = 'http://localhost:3000/api/auth'
const config = { withCredentials: true }

export async function register({ username, email, password }) {
    try {
        const response = await axios.post(`${BASE_URL}/register`, {
            username, email, password
        }, config)
        return response.data
    } catch (err) {
        throw err  // ✅
    }
}

export async function login({ email, password }) {
    try {
        const response = await axios.post(`${BASE_URL}/login`, {
            email, password
        }, config)
        return response.data
    } catch (err) {
        throw err  
    }
}

export async function logout() {
    try {
        const response = await axios.get(`${BASE_URL}/logout`, config)
        return response.data
    } catch (err) {
        throw err  
    }
}

export async function getMe() {
    try {
        const response = await axios.get(`${BASE_URL}/get-me`, config)  
        return response.data
    } catch (err) {
        throw err  
    }
}
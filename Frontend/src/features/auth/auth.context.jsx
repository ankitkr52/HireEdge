import { createContext, useState ,useEffect} from "react"
import { login, register, logout, getMe } from "./services/auth.api.js"

// yeha p import krna hai get user details 


export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

     useEffect(() => {

        const getAndSetUser = async () => {
            try {

                const data = await getMe()
                setUser(data.user)
            } catch (err) { } finally {
                setLoading(false)
            }
        }

        getAndSetUser()

    }, [])

    

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            setUser,
            setLoading
        }}>
            {children}
        </AuthContext.Provider>
    )
}
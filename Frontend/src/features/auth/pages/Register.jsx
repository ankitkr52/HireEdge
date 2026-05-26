import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'  
import { useAuth } from '../hooks/useAuth'

const Register = () => {
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const { loading, register } = useAuth() 

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await register({ username, email, password })  
            navigate("/")
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong")
        }
    }

    if (loading) {
        return <main><h1>Loading.......</h1></main>
    }

    return (
        <main>
            <div className="form-container">
                <h1>Register</h1>
                {error && <p className="error">{error}</p>}  {/* ✅ */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input onChange={(e) => setUsername(e.target.value)}
                            type="text" id="username" placeholder='Enter username' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input onChange={(e) => setEmail(e.target.value)}
                            type="email" id="email" placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input onChange={(e) => setPassword(e.target.value)}
                            type="password" id="password" placeholder='Enter password' />
                    </div>
                    <button type="submit" className='button primary-button'>Register</button>  {/* ✅ */}
                </form>
                <p>Already have an account? <Link to="/login">Login</Link></p>
            </div>
        </main>
    )
}

export default Register
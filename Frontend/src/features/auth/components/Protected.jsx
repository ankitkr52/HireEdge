import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom"
import React from 'react'
import LoadingScreen from "./LoadingScreen";

const Protected = ({ children }) => {
    const { loading, user } = useAuth()


    if (loading) {
        return (
            <LoadingScreen message="Checking authentication"
                sub="Please wait while we verify your session" />
        )
    }

    if (!user) {
        return <Navigate to={'/login'} />
    }

    return children
}

export default Protected
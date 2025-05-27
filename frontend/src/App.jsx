// src/App.jsx
import React, { useState, useEffect } from "react";
import SignInPage from "./components/SignInPage/SignInPage";
import Dashboard from "./components/Dashboard/Dashboard";

const App = () => {
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    // Check for persisted user session (if using localStorage)
    const user = localStorage.getItem("user");
    setAuthenticated(!!user);
  }, []);

  const handleSignInSuccess = (username) => {
    localStorage.setItem("user", username);
    setAuthenticated(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    setAuthenticated(false);
  };

  return (
    <>
      {authenticated ? (
        <Dashboard onSignOut={handleSignOut} />
      ) : (
        <SignInPage onSignInSuccess={handleSignInSuccess} />
      )}
    </>
  );
};

export default App;

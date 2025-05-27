// src/components/SignInPage/SignInPage.jsx
import { useState } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { backendDomain } from "../../Config";
import axios from "axios";
import PropTypes from "prop-types";

const SignInPage = ({ onSignInSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const url = `${backendDomain}/login`;
    try {
      const response = await axios.post(url, {
        username: username,
        password: password,
      });
      onSignInSuccess(response.data.username);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #73a5ff, #5477f5)",
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: 300, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Welcome Back
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSignIn}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label="Password"
            variant="outlined"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignInPage;

SignInPage.propTypes = {
  onSignInSuccess: PropTypes.func.isRequired,
};

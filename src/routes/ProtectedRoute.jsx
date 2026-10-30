import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';

const ProtectedRoute = ({ allowedRoles }) => {
  const isAuth = AuthService.isAuthenticated();
  const currentUser = AuthService.getCurrentUser();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(isAuth && !!currentUser);

  useEffect(() => {
    const handleAuthInvalidated = () => {
      setIsValid(false);
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth-invalidated', handleAuthInvalidated);

    // Revalidate session asynchronously against MongoDB Single Source of Truth
    if (isAuth && currentUser?.email) {
      AuthService.verifySession().then((verifiedUser) => {
        if (!verifiedUser) {
          setIsValid(false);
          navigate('/login', { replace: true });
        }
      });
    }

    return () => {
      window.removeEventListener('auth-invalidated', handleAuthInvalidated);
    };
  }, [navigate]);

  if (!isAuth || !currentUser || !isValid) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = currentUser.role;
    if (!allowedRoles.includes(userRole)) {
      // Redirect unauthorized user to their proper dashboard based on actual account role
      if (userRole === 'Customer') {
        return <Navigate to="/customer/dashboard" replace />;
      } else if (userRole === 'Provider') {
        return <Navigate to="/provider/dashboard" replace />;
      } else if (userRole === 'Admin') {
        return <Navigate to="/admin/dashboard" replace />;
      } else {
        return <Navigate to="/login" replace />;
      }
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;

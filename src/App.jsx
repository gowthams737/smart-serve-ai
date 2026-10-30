import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ProtectedRoute from './routes/ProtectedRoute';
import NotFound from './pages/NotFound';
import HelpCenter from './pages/HelpCenter';

// Customer imports
import CustomerLayout from './layouts/CustomerLayout';
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerServices from './pages/customer/Services';
import CustomerProviders from './pages/customer/Providers';
import BookingsAndSaved from './pages/customer/BookingsAndSaved';
import CustomerHistory from './pages/customer/History';
import CustomerSaved from './pages/customer/Saved';
import CustomerNotifications from './pages/customer/Notifications';
import CustomerProfile from './pages/customer/Profile';
import AIAssistant from './pages/customer/AIAssistant';
import AIRecommendations from './pages/customer/AIRecommendations';
import AICostEstimator from './pages/customer/AICostEstimator';
import AIServicePlanner from './pages/customer/AIServicePlanner';
import AIInsights from './pages/customer/AIInsights';

// Provider imports
import ProviderLayout from './layouts/ProviderLayout';
import ProviderRegister from './pages/provider/Register';
import ProviderDashboard from './pages/provider/Dashboard';
import ProviderProfile from './pages/provider/Profile';
import ProviderServices from './pages/provider/Services';
import ProviderBookings from './pages/provider/Bookings';
import ProviderReviews from './pages/provider/Reviews';
import ProviderAvailability from './pages/provider/Availability';
import ProviderNotifications from './pages/provider/Notifications';
import ProviderSettings from './pages/provider/Settings';

// Admin imports
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import CustomerManagement from './pages/admin/CustomerManagement';
import ProviderManagement from './pages/admin/ProviderManagement';
import ServiceManagement from './pages/admin/ServiceManagement';
import BookingManagement from './pages/admin/BookingManagement';
import ReportsAnalytics from './pages/admin/ReportsAnalytics';
import AdminNotifications from './pages/admin/Notifications';
import ComplaintManagement from './pages/admin/ComplaintManagement';
import PlatformSettings from './pages/admin/Settings';
import AdminProfile from './pages/admin/Profile';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
        {/* Main Customer Layout */}
        <Route element={<MainLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/help" element={<HelpCenter />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/edit-profile" element={<EditProfilePage />} />
          </Route>
        </Route>

        {/* Customer Panel Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
          <Route element={<CustomerLayout />}>
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/services" element={<CustomerServices />} />
            <Route path="/customer/providers" element={<CustomerProviders />} />
            <Route path="/customer/bookings-and-saved" element={<BookingsAndSaved />} />
            <Route path="/customer/history" element={<BookingsAndSaved />} />
            <Route path="/customer/saved" element={<BookingsAndSaved />} />
            <Route path="/customer/notifications" element={<CustomerNotifications />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/customer/ai-assistant" element={<AIAssistant />} />
            <Route path="/customer/ai-recommendations" element={<AIRecommendations />} />
            <Route path="/customer/ai-estimator" element={<AICostEstimator />} />
            <Route path="/customer/ai-planner" element={<AIServicePlanner />} />
            <Route path="/customer/ai-insights" element={<AIInsights />} />
          </Route>
        </Route>

        {/* Provider Routes */}
        <Route path="/provider/register" element={<ProviderRegister />} />
        <Route element={<ProtectedRoute allowedRoles={['Provider']} />}>
          <Route element={<ProviderLayout />}>
            <Route path="/provider/dashboard" element={<ProviderDashboard />} />
            <Route path="/provider/profile" element={<ProviderProfile />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/provider/bookings" element={<ProviderBookings />} />
            <Route path="/provider/reviews" element={<ProviderReviews />} />
            <Route path="/provider/availability" element={<ProviderAvailability />} />
            <Route path="/provider/notifications" element={<ProviderNotifications />} />
            <Route path="/provider/settings" element={<ProviderSettings />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/customers" element={<CustomerManagement />} />
            <Route path="/admin/providers" element={<ProviderManagement />} />
            <Route path="/admin/services" element={<ServiceManagement />} />
            <Route path="/admin/bookings" element={<BookingManagement />} />
            <Route path="/admin/reports" element={<ReportsAnalytics />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/complaints" element={<ComplaintManagement />} />
            <Route path="/admin/settings" element={<PlatformSettings />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </ErrorBoundary>
  );
}

export default App;


import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Edit3, LogOut, Settings, Bell, Shield } from 'lucide-react';
import { AuthService } from '../services/authService';
import Button from '../components/Button';

const ProfilePage = () => {
  const user = AuthService.getCurrentUser();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] text-center">
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-blue-500/20 p-1 flex items-center justify-center bg-slate-800 overflow-hidden">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User className="w-16 h-16 text-blue-500" />
                  )}
                </div>
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-slate-900 rounded-full" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{user.fullName}</h3>
              <p className="text-slate-400 text-sm mb-6 capitalize">{user.role || 'Member'}</p>
              
              <div className="flex flex-col gap-3">
                {user.role === 'Customer' && (
                  <Link to="/customer/dashboard" className="w-full">
                    <Button variant="primary" className="w-full">
                      Go to Customer Portal
                    </Button>
                  </Link>
                )}
                {user.role === 'Provider' && (
                  <Link to="/provider/dashboard" className="w-full">
                    <Button variant="primary" className="w-full">
                      Go to Provider Portal
                    </Button>
                  </Link>
                )}
                {user.role === 'Admin' && (
                  <Link to="/admin/dashboard" className="w-full">
                    <Button variant="primary" className="w-full">
                      Go to Admin Portal
                    </Button>
                  </Link>
                )}
                <Link to="/edit-profile" className="w-full">
                  <Button variant="outline" className="w-full">
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                </Link>
                <Button variant="danger" className="w-full" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </div>
            </div>

            <div className="bg-slate-910/30 border border-white/5 p-6 rounded-[24px]">
              <nav className="space-y-2">
                {[
                  { icon: Settings, label: 'Account Settings' },
                  { icon: Bell, label: 'Notifications' },
                  { icon: Shield, label: 'Password & Security' },
                ].map((item, idx) => (
                  <button key={idx} className="w-full flex items-center justify-between p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    <div className="flex items-center gap-3 font-medium text-sm">
                      <item.icon className="w-4 h-4" /> {item.label}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px]">
              <h2 className="text-2xl font-bold text-white mb-8">Personal Information</h2>
              
              <div className="space-y-8">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <User className="text-blue-500 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Full Name</p>
                    <p className="text-lg text-white font-semibold">{user.fullName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="text-blue-500 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Email Address</p>
                    <p className="text-lg text-white font-semibold">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Phone className="text-blue-500 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Phone Number</p>
                    <p className="text-lg text-white font-semibold">{user.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Genuine Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-white/5 p-6 rounded-[24px]">
                <p className="text-slate-400 text-sm mb-1">Total Bookings</p>
                <h4 className="text-3xl font-bold text-white">{user.stats?.totalBookings ?? user.bookingsCount ?? 0}</h4>
              </div>
              <div className="bg-slate-900 border border-white/5 p-6 rounded-[24px]">
                <p className="text-slate-400 text-sm mb-1">Completed Services</p>
                <h4 className="text-3xl font-bold text-blue-500">{user.stats?.completedServices ?? user.completedJobs ?? 0}</h4>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

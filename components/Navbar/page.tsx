import { X, Menu } from 'lucide-react';
import React, { useState  } from 'react';
import Link from 'next/link';
import { signInWithGoogle } from '@/lib/users';
import { useUser } from '@/context/userContext';
import Sidebar from './Sidebar';

const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const { user, isLoading } = useUser();
  const [imgError, setImgError] = useState(false);

  const displayName = user ? (user.fullName || user.username) : "";
  const fallbackLetter = displayName ? displayName.charAt(0).toUpperCase() : "";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex sticky left-0 top-0 h-screen w-96 bg-white border-r border-slate-200 p-6 flex-col z-50">
        <Sidebar isOpen ={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          
          <Link href={'/home'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">VANTEDGE</span>
          </Link>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          ) : user ? (
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center overflow-hidden"
            >
              {!imgError && user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="User avatar"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                fallbackLetter
              )}
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-screen w-80 bg-white border-r border-slate-200 p-6 flex flex-col z-50 transform transition-transform">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
            <Sidebar isOpen ={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
          </aside>
        </>
      )}
    </>
  );
};

export default Navbar;
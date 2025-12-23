import { X, Menu, Zap, SearchCheckIcon, SearchCode, SearchIcon } from 'lucide-react';
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
      <aside className="hidden lg:flex sticky left-0 top-0 h-screen w-84 bg-white border-r border-slate-200 p-6 flex-col z-50">
        <Sidebar isOpen ={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <SearchIcon className="w-6 h-6 text-slate-700" />
          </button>
          <div>

          <Link href={'/home'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none italic">The VantEdge</h1>
            </div>
          </Link>
          </div>

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
        <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase text-center w-full flex justify-center">Intelligence OS</span>
      </header>

      {/* Mobile Menu Overlay */}
        <>
          <aside 
            className={`lg:hidden fixed left-0 top-0 h-screen w-80 bg-white border-r border-slate-200 p-6 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors h-8 w-full flex justify-end"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
            <Sidebar isOpen ={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
          </aside>
        </>
    </>
  );
};

export default Navbar;
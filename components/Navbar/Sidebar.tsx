import { GoogleLogo } from '@/constants/assets/googleLogo.svg';
import { useSearch } from '@/context/searchContext';
import { useUser } from '@/context/userContext';
import { api } from '@/convex/_generated/api';
import { signInWithGoogle } from '@/lib/users';
import { useQuery } from 'convex/react';
import { LogOut, Radar, Search, X, Zap, MessageCircleMore, Home, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'
import SearchBar from './SearchBar';
import { trackEvent, GA_EVENT } from '@/lib/analytics/ga';

export interface SidebarInterface {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarInterface> = ({
  isOpen,
  setIsOpen
}) => {


  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const { user, isLoading, signOut } = useUser();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = user ? (user.fullName || user.username) : "";
  const fallbackLetter = displayName ? displayName.charAt(0).toUpperCase() : "";


  const handleSignIn = () => {
    trackEvent(GA_EVENT.SIGN_IN_CLICK);
    signInWithGoogle();
  }
  const handleSignOut = () => {
    trackEvent(GA_EVENT.SIGN_OUT_CLICK);
    signOut();
  }


  return (
    <>
      {/* Logo */}
      <Link href={'/home'} className="hidden lg:flex items-center gap-3 py-8">
        <div className="flex items-center gap-3 mb-4 ">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <Radar className="w-6 h-6 text-white" />
          </div>
          <div className="relative inline-block">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-none italic">
              The VantEdge
            </h1>

            <span className="absolute my-1 right-0 text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase">
              powered by Pkeday
            </span>
          </div>

        </div>
      </Link>

      {/* Search Bar */}
      <div className='hidden lg:block mb-8'>

        <SearchBar inputRef={inputRef} />
      </div>

      {/* Main Heading */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 leading-tight">
          Find <span className="text-blue-600">blogs</span> on
        </h2>
        <h2 className="text-2xl font-bold text-slate-900 leading-tight">
          companies you are
        </h2>
        <h2 className="text-2xl font-bold leading-tight">
          <span className="text-blue-600">tracking.</span>
        </h2>
      </div>
      {/* Home Button - Enhanced (Mobile only) */}
      <div className='border border-slate-200 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm'>

        <button
          className="group relative flex items-center justify-between text-slate-700 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer text-sm font-medium px-4 py-3.5 w-full"
          onClick={() => {
            trackEvent(GA_EVENT.HOME_CLICKED)
            router.push("/home")
            setIsOpen(false)
          }}
        >
          <div className='flex items-center gap-3'>
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors duration-200">
              <Home className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors duration-200" />
            </div>
            <span className="text-slate-700 group-hover:text-slate-900 transition-colors duration-200">Home</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" />
        </button>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent mx-4" />

        {/* Submit Sources Button */}
        <button
          className="group relative flex items-center justify-between text-slate-700 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer text-sm font-medium px-4 py-3.5 w-full"
          onClick={() => {
            trackEvent(GA_EVENT.TRACK_BLOG_CLICKED)
            router.push("/track-link")
            setIsOpen(false)
          }}
        >
          <div className='flex items-center gap-3'>
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors duration-200">
              <MessageCircleMore className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors duration-200" />
            </div>
            <span className="text-slate-700 group-hover:text-slate-900 transition-colors duration-200">Submit Sources</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" />
        </button>

      </div>



      {/* User Section at Bottom */}
      <div className="mt-auto  border-t border-slate-200">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3" />
            </div>
          </div>
        ) : user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 w-full hover:bg-slate-50 rounded-lg p-2 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center overflow-hidden flex-shrink-0">
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
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {user.fullName || user.username}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-sm font-medium text-slate-700 w-full justify-center text-sm"
          >
            <GoogleLogo />
            Sign in
          </button>
        )}
      </div>

      {/* Version Footer */}
      <div className="mt-6 text-xs text-slate-400 text-center flex space-x-2">
        <div>
          THE VANTEDGE • V1.0
        </div>
        <div>
          <Link href={'/privacy-policy'} onClick={() => setIsOpen(false)}>Privacy Policy</Link>
        </div>
      </div>
    </>
  )
}

export default Sidebar

import { X, Menu, Zap, SearchCheckIcon, SearchCode, SearchIcon, Search } from 'lucide-react';
import React, { useState } from 'react';
import Link from 'next/link';
import { signInWithGoogle } from '@/lib/users';
import { useUser } from '@/context/userContext';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchBaropen, setIsSearchBarOpen] = useState<boolean>(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex sticky left-0 top-0 h-screen w-84 bg-white border-r border-slate-200 p-6 flex-col z-50">
        <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
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

          <div>
            <button className='lg:hidden' onClick={() => setIsSearchBarOpen(true)}>
              <Search />
            </button>

            {/* Sliding search bar */}
            <div
              className={`fixed top-0 right-0  bg-white shadow-lg z-50 flex items-center justify-center gap-2 p-4 transition-transform duration-300 ease-in-out ${isSearchBaropen ? 'translate-x-0' : 'translate-x-full'
                } w-screen`}
            >
              <SearchBar shouldFocus ={isSearchBaropen}/>
              <button
                onClick={() => setIsSearchBarOpen(false)}
                className="hover:bg-gray-100 rounded p-2 transition-colors"
              >
                <X />
              </button>
            </div>
          </div>

        </div>
        <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase text-center w-full flex justify-center">Intelligence OS</span>
      </header>

      {/* Mobile Menu Overlay */}
      <>
        <aside
          className={`lg:hidden fixed left-0 top-0 h-[100dvh] w-80 bg-white border-r border-slate-200 p-6 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } overflow-y-auto`}
        >
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="self-end p-2 hover:bg-slate-100 rounded-lg transition-colors mb-4"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
          <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        </aside>
      </>
    </>
  );
};

export default Navbar;
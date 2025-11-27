import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type DropdownProps = {
    title: string;
    titleAction: () => void;
    options: {
        name: string;
        link:string;
    }[];
}

const Dropdown: React.FC<DropdownProps> = ({ title, titleAction, options }) => {

    const [showAllOptions, setShowAllOptions] = useState(false)
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowAllOptions(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowAllOptions(!showAllOptions)}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium text-blue-900 text-xs md:text-sm"
            >
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        titleAction();
                    }}

                    className="hover:text-blue-600"
                >
                    {title}
                </div>
               { options.length >=1 &&<span className="text-xs text-slate-500">
                    +{options.length}
                </span>}
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllOptions ? 'rotate-180' : ''}`} />
            </button>

            {showAllOptions && (
                <div className="absolute max-h-32 overflow-auto top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px] py-1">
                    {options.map((company, idx) => (
                        <Link
                            key={idx}
                            href={company.link}
                            className="block px-4 py-2 text-xs md:text-sm text-blue-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => {
                                setShowAllOptions(false)
                            }}
                        >
                            {company.name}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Dropdown

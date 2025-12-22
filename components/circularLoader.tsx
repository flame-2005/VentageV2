import React from 'react'

type CircularLoaderProps = {
    title?: string;
    message?: string;
}

const CircularLoader = ({ title = "Loading Investment Insights", message = "Fetching the latest market analysis..." }: CircularLoaderProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-32 w-full h-full">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
                {title  }
            </h3>
            <p className="text-slate-500">
                {message}
            </p>
        </div>
    )
}

export default CircularLoader

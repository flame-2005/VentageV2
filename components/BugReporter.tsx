"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, Bug } from "lucide-react";

const BugReporter = () => {
  const submitBug = useMutation(api.functions.bugs.submitBugReport);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!email || !description) return;

    try {
      setLoading(true);

      await submitBug({
        email,
        pageLink: window.location.href,
        bugDescription: description,
      });

      setEmail("");
      setDescription("");
      setOpen(false);
    } catch (err) {
      console.error("Bug report failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-black text-white px-4 py-3 shadow-lg hover:bg-slate-900 transition"
      >
        <Bug className="w-4 h-4" />
        <span className="text-sm font-medium">Report Bug</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Report a Bug</h3>
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Email */}
              <input
                type="email"
                required
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-black"
              />

              {/* Description */}
              <textarea
                placeholder="Describe the issue..."
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-black"
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Bug"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BugReporter;

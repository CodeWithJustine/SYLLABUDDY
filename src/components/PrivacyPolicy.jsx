import { useEffect, useRef, useState } from 'react'

export default function PrivacyPolicy() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      trigger?.focus()
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="underline underline-offset-4 hover:text-slate-600 dark:hover:text-slate-200"
      >
        Privacy Policy
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-policy-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:p-8"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2
                id="privacy-policy-title"
                className="text-2xl font-extrabold text-slate-900 dark:text-white"
              >
                SyllaBuddy Privacy Policy
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close privacy policy"
                className="shrink-0 rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  1. Data Collection and Usage
                </h3>
                <p>
                  SyllaBuddy stores the username you provide, an account creation
                  timestamp, a password hash, and the task information you enter,
                  including task names, course details, due dates, statuses, and
                  task creation timestamps. This information is used only for
                  sign-in and task management in this browser. Passwords are not
                  stored in plain text.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  2. Data Storage
                </h3>
                <p>
                  Account and task data are saved in this browser&apos;s
                  localStorage on this device and are not synchronized between
                  devices. SyllaBuddy does not send this account or task data to
                  an application backend. The hosting provider delivers the
                  website and may process routine connection data; refer to that
                  provider&apos;s policy for details.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  3. Data Deletion
                </h3>
                <p>
                  You can delete tasks from the completed or missed task lists.
                  Clearing this site&apos;s browser data removes the locally
                  saved account, session, and tasks. Logging out only clears the
                  saved session; it does not delete the account or tasks.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  4. Security Safeguards
                </h3>
                <p>
                  SyllaBuddy is a client-side demonstration, not a secure
                  authentication service. Data in localStorage can be accessed
                  or changed by someone with access to your device or browser,
                  and client-side password hashing does not provide server-grade
                  account security. Do not use a real or reused password.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  5. Contact Information
                </h3>
                <p>
                  For questions about this policy, contact the developer at{' '}
                  <span className="font-medium text-slate-900 dark:text-white">
                    @justinecdelossantos.gmail.com
                  </span>
                  .
                </p>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

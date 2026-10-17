import { useEffect, useRef, useState } from 'react'

export default function PrivacyPolicy() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const trigger = triggerRef.current

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
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
              <h2 id="privacy-policy-title" className="text-2xl font-extrabold text-slate-900 dark:text-white">
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
                <h3 className="font-bold text-slate-900 dark:text-white">1. Information used</h3>
                <p>
                  SyllaBuddy uses the email address and display name you provide,
                  your timezone and reminder preferences, tasks and deadlines,
                  saved study questions, and study-session records to provide the
                  application. Supabase Auth handles account passwords and
                  sessions; SyllaBuddy does not store password hashes in its own
                  application data.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">2. Storage and access</h3>
                <p>
                  Account and productivity data are stored in the Supabase
                  project configured by the application operator. Database row
                  security is intended to restrict records to their account.
                  Theme choice, an optional running timer, and a one-time local
                  task-import marker may be stored in this browser. A prior
                  version may have left mock account data in this browser; this
                  version does not read or import those credentials. Supabase
                  and the site host process data under their own terms.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">3. Reminders and device permission</h3>
                <p>
                  In-app reminders are stored in the account&apos;s notification
                  history. Browser/device push is optional and is enabled only
                  after you choose to enable it and grant browser permission.
                  Push subscriptions are stored to deliver reminders to that
                  browser. Disable push in the notification menu or revoke
                  permission in browser settings. Delivery depends on browser,
                  device, and network support.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">4. Retention and deletion</h3>
                <p>
                  Tasks and study records remain in the configured project until
                  deleted or removed by its operator. You can permanently delete
                  completed or missed tasks in the app. Account deletion is not
                  currently available in the interface; contact the application
                  operator using the support channel provided with the deployed
                  service to request account-data removal.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 dark:text-white">5. Security and deployment</h3>
                <p>
                  The application uses Supabase authentication and row-level
                  security, but no online service can promise absolute security.
                  The operator is responsible for configuring Supabase, email,
                  hosting, secrets, and applicable privacy/legal requirements
                  before inviting real users. Do not use SyllaBuddy to store
                  highly sensitive information.
                </p>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.scss'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata = {
  title: 'My Tarot Readings',
  description: 'Discover your spiritual path through tarot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        ></script>
      </head>
      <body>
        <div className="app-shell d-flex flex-column min-vh-100">
          <Header />
          <main className="container py-4 flex-grow-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}

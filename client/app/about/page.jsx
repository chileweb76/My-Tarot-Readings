"use client"

import Link from 'next/link'
import AuthWrapper from '../../components/AuthWrapper'

export default function AboutPage() {
  return (
    <AuthWrapper>
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card card-reading p-4">
            <h1 className="mb-4">About Tarot Readings</h1>
          
          <p className="lead">
            Tarot is an ancient practice that uses symbolic cards to provide insights
            into your life and spiritual path.
          </p>
          
          <h3 className="mt-4 mb-3">How It Works</h3>
          <p>
            Each tarot card contains rich symbolism and meaning. When cards are drawn 
            and arranged in specific patterns called spreads, they can offer guidance 
            and reflection on various aspects of your life.
          </p>
          
          <h3 className="mt-4 mb-3">The Three-Card Spread</h3>
          <div className="row g-3 mb-4">
            <div className="col-md-4 text-center">
              <div className="tarot-card mb-2">🌙</div>
              <h5>Past</h5>
              <p className="text-muted">
                Influences and experiences that have shaped your current situation.
              </p>
            </div>
            <div className="col-md-4 text-center">
              <div className="tarot-card mb-2">⭐</div>
              <h5>Present</h5>
              <p className="text-muted">
                Your current state, challenges, and opportunities.
              </p>
            </div>
            <div className="col-md-4 text-center">
              <div className="tarot-card mb-2">☀️</div>
              <h5>Future</h5>
              <p className="text-muted">
                Potential outcomes and paths based on current energy.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Link href="/reading" className="btn btn-primary btn-lg">
              Get Your Reading Now
            </Link>
          </div>
        </div>
      </div>
    </div>
    </AuthWrapper>
  )
}

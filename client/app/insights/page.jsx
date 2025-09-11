'use client'

import AuthWrapper from '../../components/AuthWrapper'

export default function InsightsPage() {
  return (
    <AuthWrapper>
      <div className="row">
        <div className="col-lg-10 mx-auto">
          <div className="card card-reading p-4">
            <h1 className="text-center mb-4">
              <i className="fas fa-lightbulb text-warning me-2"></i>
              Tarot Insights
            </h1>
            
            <p className="lead text-center mb-5">
              Discover personalized insights based on your reading history and spiritual journey.
            </p>

            <div className="row g-4 mb-5">
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-chart-line fa-3x text-primary mb-3"></i>
                    <h5 className="card-title">Reading Patterns</h5>
                    <p className="card-text text-muted">
                      Analyze trends in your readings and discover recurring themes in your spiritual path.
                    </p>
                    <button className="btn btn-outline-primary">View Analysis</button>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-heart fa-3x text-danger mb-3"></i>
                    <h5 className="card-title">Emotional Journey</h5>
                    <p className="card-text text-muted">
                      Track your emotional growth and understand the deeper messages from your readings.
                    </p>
                    <button className="btn btn-outline-danger">Explore Journey</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-star fa-2x text-warning mb-3"></i>
                    <h6 className="card-title">Most Frequent Card</h6>
                    <p className="h4 text-primary">The Star</p>
                    <small className="text-muted">Appeared in 23% of readings</small>
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-calendar-alt fa-2x text-info mb-3"></i>
                    <h6 className="card-title">Total Readings</h6>
                    <p className="h4 text-primary">47</p>
                    <small className="text-muted">This month: 12</small>
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-trophy fa-2x text-success mb-3"></i>
                    <h6 className="card-title">Accuracy Score</h6>
                    <p className="h4 text-primary">85%</p>
                    <small className="text-muted">Based on feedback</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h4 className="mb-3">Recent Insights</h4>
              <div className="alert alert-info" role="alert">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Pattern Detected:</strong> Your recent readings suggest a period of transformation and new beginnings. 
                The recurring appearance of cups indicates emotional growth is central to your current journey.
              </div>
              
              <a href="/reading" className="btn btn-primary btn-lg me-3">
                <i className="fas fa-cards-blank me-2"></i>
                Get New Reading
              </a>
              <a href="/decks" className="btn btn-outline-primary btn-lg">
                <i className="fas fa-layer-group me-2"></i>
                Explore Decks
              </a>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  )
}

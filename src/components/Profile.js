import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, Clock, MessageCircle, Phone, BookOpen, Calendar, Target, User } from 'lucide-react';
import './Profile.css';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.config'; // Adjust this path based on where your firebase config is located

// Simple UI components
const Card = ({ children, className = '' }) => (
  <div className={`card ${className}`}>{children}</div>
);

const CardHeader = ({ children }) => <div className="card-header">{children}</div>;
const CardTitle = ({ children }) => <h3 className="card-title">{children}</h3>;
const CardDescription = ({ children }) => <p className="card-description">{children}</p>;
const CardContent = ({ children }) => <div className="card-content">{children}</div>;

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '' }) => (
  <button 
    className={`btn btn-${variant} ${className}`} 
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Progress = ({ value }) => (
  <div className="progress-container">
    <div className="progress-bar" style={{ width: `${Math.min(100, value)}%` }}></div>
  </div>
);

function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activityCounts, setActivityCounts] = useState({
    prospects: 0,
    calls: 0,
    messages: 0,
    meetings: 0,
    opportunities: 0,
    development: 0
  });
  const [history, setHistory] = useState([]);
  const [focusSession, setFocusSession] = useState({
    active: false,
    activity: null,
    startTime: null,
    duration: 25 * 60,
    timeRemaining: 25 * 60
  });

  // Activities and their point values
  const activities = [
    { id: 'prospects', name: 'New Prospects', icon: <User />, pointsPerUnit: 0.1, unit: 'contacts', color: '#4338ca' },
    { id: 'calls', name: 'Connected Calls', icon: <Phone />, pointsPerUnit: 1, unit: 'calls', color: '#0891b2' },
    { id: 'messages', name: 'Value Messages', icon: <MessageCircle />, pointsPerUnit: 0.2, unit: 'messages', color: '#059669' },
    { id: 'meetings', name: 'Meetings Booked', icon: <Calendar />, pointsPerUnit: 1, unit: 'meetings', color: '#ca8a04' },
    { id: 'opportunities', name: 'Opportunities Created', icon: <Target />, pointsPerUnit: 1, unit: 'opportunities', color: '#dc2626' },
    { id: 'development', name: 'Personal Development', icon: <BookOpen />, pointsPerUnit: 1, unit: '30+ min sessions', color: '#9333ea', maxPoints: 1 }
  ];

  // Load data from Firebase
  useEffect(() => {
    if (currentUser) {
      const loadData = async () => {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setActivityCounts(data.activityCounts || activityCounts);
            setHistory(data.history || []);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      };
      loadData();
    }
  }, [currentUser]);

  // Save data to Firebase
  useEffect(() => {
    if (currentUser) {
      const saveData = async () => {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, {
            activityCounts,
            history,
            email: currentUser.email,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error('Error saving user data:', error);
        }
      };
      saveData();
    }
  }, [currentUser, activityCounts, history]);

  // Focus session timer
  useEffect(() => {
    let interval;
    
    if (focusSession.active && focusSession.timeRemaining > 0) {
      interval = setInterval(() => {
        setFocusSession(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
    } else if (focusSession.active && focusSession.timeRemaining <= 0) {
      if (focusSession.activity === 'development') {
        handleIncrement('development');
      }
      
      try {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.play();
      } catch (error) {
        console.log('Audio playback failed:', error);
      }
      
      setFocusSession({
        active: false,
        activity: null,
        startTime: null,
        duration: 25 * 60,
        timeRemaining: 25 * 60
      });
    }
    
    return () => clearInterval(interval);
  }, [focusSession]);

  const calculatePoints = (activityId, count) => {
    const activity = activities.find(a => a.id === activityId);
    let points = count * activity.pointsPerUnit;
    
    if (activity.maxPoints && points > activity.maxPoints) {
      points = activity.maxPoints;
    }
    
    return points;
  };

  const getTotalPoints = () => {
    return Object.entries(activityCounts).reduce((total, [activityId, count]) => {
      return total + calculatePoints(activityId, count);
    }, 0);
  };

  const handleIncrement = (activityId) => {
    setActivityCounts(prev => ({
      ...prev,
      [activityId]: prev[activityId] + 1
    }));
  };

  const handleDecrement = (activityId) => {
    setActivityCounts(prev => ({
      ...prev,
      [activityId]: Math.max(0, prev[activityId] - 1)
    }));
  };

  const startFocusSession = (activityId) => {
    setFocusSession({
      active: true,
      activity: activityId,
      startTime: new Date(),
      duration: 25 * 60,
      timeRemaining: 25 * 60
    });
  };

  const endFocusSession = () => {
    setFocusSession({
      active: false,
      activity: null,
      startTime: null,
      duration: 25 * 60,
      timeRemaining: 25 * 60
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveDailyProgress = () => {
    const today = new Date().toISOString().split('T')[0];
    const totalPoints = getTotalPoints();
    
    const existingEntryIndex = history.findIndex(entry => entry.date === today);
    
    if (existingEntryIndex >= 0) {
      const updatedHistory = [...history];
      updatedHistory[existingEntryIndex] = {
        date: today,
        totalPoints,
        ...activityCounts
      };
      setHistory(updatedHistory);
    } else {
      setHistory([...history, {
        date: today,
        totalPoints,
        ...activityCounts
      }]);
    }
    
    setActivityCounts({
      prospects: 0,
      calls: 0,
      messages: 0,
      meetings: 0,
      opportunities: 0,
      development: 0
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = history
    .slice(-14)
    .map(entry => ({
      date: formatDate(entry.date),
      points: entry.totalPoints,
      goal: 8
    }));

  const totalPoints = getTotalPoints();
  const goalPercentage = (totalPoints / 8) * 100;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Rule of 8 Sales Tracker</h1>
        <div className="user-info">
          <span>{currentUser.email}</span>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Progress</CardTitle>
          <CardDescription>Track your daily sales activities and reach your goals</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="progress-section">
            <div className="progress-header">
              <div className="progress-label">Today's Progress: {totalPoints.toFixed(1)} / 8 points</div>
              <div className="progress-percentage">{goalPercentage.toFixed(0)}% Complete</div>
            </div>
            <Progress value={goalPercentage} />
          </div>

          <div className="activities-grid">
            {activities.map((activity) => (
              <Card key={activity.id} className="activity-card">
                <div className="activity-color-bar" style={{ backgroundColor: activity.color }}></div>
                <CardHeader>
                  <div className="activity-header">
                    <div className="activity-icon" style={{ backgroundColor: `${activity.color}20` }}>
                      {React.cloneElement(activity.icon, { color: activity.color, size: 20 })}
                    </div>
                    <div>
                      <CardTitle>{activity.name}</CardTitle>
                      <CardDescription>{activity.unit}</CardDescription>
                    </div>
                    <div className="activity-points">
                      {calculatePoints(activity.id, activityCounts[activity.id]).toFixed(1)}pt
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="activity-controls">
                    <div className="counter-controls">
                      <Button 
                        variant="outline"
                        onClick={() => handleDecrement(activity.id)}
                        disabled={activityCounts[activity.id] <= 0}
                      >
                        -
                      </Button>
                      <div className="counter-value">
                        {activityCounts[activity.id]}
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => handleIncrement(activity.id)}
                      >
                        +
                      </Button>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => startFocusSession(activity.id)}
                      disabled={focusSession.active}
                      className="focus-button"
                    >
                      <Clock size={16} /> Focus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="save-button-container">
            <Button onClick={saveDailyProgress} className="save-button">
              <CheckCircle size={16} /> Save Today's Progress
            </Button>
          </div>

          {focusSession.active && (
            <div className="focus-session-overlay">
              <div className="focus-session-content">
                <h3>Focus Session</h3>
                <div className="focus-timer">
                  {formatTime(focusSession.timeRemaining)}
                </div>
                <Progress 
                  value={(focusSession.timeRemaining / focusSession.duration) * 100} 
                />
                <Button 
                  variant="destructive"
                  onClick={endFocusSession}
                  className="end-focus-button"
                >
                  End Session
                </Button>
              </div>
            </div>
          )}

          <div className="history-section">
            <h3>Performance History</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#4f46e5" 
                    strokeWidth={2}
                    name="Points Earned" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="goal" 
                    stroke="#e11d48" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Daily Goal" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Profile; 
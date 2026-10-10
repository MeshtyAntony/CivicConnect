import { useEffect, useState } from 'react';
import {
  Home,
  Search,
  PlusSquare,
  Bell,
  UserCircle,
  Compass,
  ThumbsUp,
  MessageCircle,
} from 'lucide-react'

import ReportForm from './ReportForm'
import './App.css'

const categoryNames = {
  roads: 'Roads & Potholes',
  streetlights: 'Streetlights',
  garbage: 'Garbage & Sanitation',
  water: 'Water Supply',
  drainage: 'Drainage & Flooding',
  transport: 'Public Transport',
  traffic: 'Traffic & Parking',
  electricity: 'Electricity',
  safety: 'Public Safety',
  government: 'Government Services',
  parks: 'Parks & Public Spaces',
  other: 'Other',
}
const categoryDescriptions = {
  roads: 'INFRASTRUCTURE',
  streetlights: 'PUBLIC LIGHTING',
  garbage: 'SANITATION',
  water: 'PUBLIC UTILITIES',
  drainage: 'FLOOD & DRAINAGE',
  transport: 'TRANSPORTATION',
  traffic: 'ROAD SAFETY',
  electricity: 'POWER SERVICES',
  safety: 'PUBLIC SAFETY',
  government: 'CIVIC SERVICES',
  parks: 'PUBLIC SPACES',
  other: 'OTHER ISSUES',
}

function App() {
  const [showLandingPage, setShowLandingPage] = useState(true)
    const [activePage, setActivePage] = useState('home')
    const [reportsLoading, setReportsLoading] = useState(true)
const [reportsError, setReportsError] = useState('')
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [reports, setReports] = useState([]);
    
function handleStatusChange(reportIndex, newStatus) {
  setReports((previousReports) =>
    previousReports.map((report, index) =>
      index === reportIndex
        ? { ...report, status: newStatus }
        : report
    )
  );
}

    
useEffect(() => {
  async function fetchReports() {
    try {
      setReportsLoading(true);
      setReportsError('');

      const response = await fetch('http://localhost:5000/api/reports');

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReportsError('Could not load reports. Please try again.');
    } finally {
      setReportsLoading(false);
    }
  }

  fetchReports();
}, []);

    const [supportCounts, setSupportCounts] = useState(() => {
  const savedSupports = localStorage.getItem('civicconnect-supports');
  return savedSupports ? JSON.parse(savedSupports) : {};
});
    const [comments, setComments] = useState(() => {
  const savedComments = localStorage.getItem('civicconnect-comments');
  return savedComments ? JSON.parse(savedComments) : {};
});
const [notifications, setNotifications] = useState(() => {
  const savedNotifications = localStorage.getItem('civicconnect-notifications');
  return savedNotifications ? JSON.parse(savedNotifications) : [];
});
    const [commentInputs, setCommentInputs] = useState({})
    const [activeCommentReport, setActiveCommentReport] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    useEffect(() => {
  localStorage.setItem(
    'civicconnect-reports',
    JSON.stringify(reports)
  );
}, [reports]);
useEffect(() => {
  localStorage.setItem(
    'civicconnect-supports',
    JSON.stringify(supportCounts)
  );
}, [supportCounts]);

useEffect(() => {
  localStorage.setItem(
    'civicconnect-comments',
    JSON.stringify(comments)
  );
}, [comments]);
useEffect(() => {
  localStorage.setItem(
    'civicconnect-notifications',
    JSON.stringify(notifications)
  );
}, [notifications]);


async function handleReportSubmit(reportData) {
  try {
    const formData = new FormData();

    formData.append('title', reportData.title);
    formData.append('description', reportData.description);
    formData.append('category', reportData.category);
    formData.append('location', reportData.location);

    if (reportData.priority) {
      formData.append('priority', reportData.priority);
    }

    if (reportData.photo instanceof File) {
      formData.append('photo', reportData.photo);
    }

    const response = await fetch('http://localhost:5000/api/reports', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.details
          ? JSON.stringify(data.details)
          : data.error || 'Failed to submit report'
      );
    }

    const savedReport = data.report;

    setReports((previousReports) => [
      savedReport,
      ...previousReports,
    ]);

    setNotifications((previousNotifications) => [
      ...previousNotifications,
      {
        id: Date.now(),
        message: `Your report "${savedReport.title}" has been submitted successfully.`,
        date: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).toUpperCase(),
        read: false,
      },
    ]);

    return true;
  } catch (error) {
    console.error('Report submission failed:', error);
    window.alert(`Could not submit report: ${error.message}`);
    return false;
  }
}


async function handleSupport(reportIndex) {
  const report = reports[reportIndex];

  if (!report) return;

  const reportId = report.id || report._id;

  if (!reportId) {
    window.alert('Could not identify this report.');
    return;
  }

  try {
    let clientId = localStorage.getItem('civicconnect-client-id');

    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem('civicconnect-client-id', clientId);
    }

    const response = await fetch(
      `http://localhost:5000/api/reports/${reportId}/support`,
      {
        method: 'POST',
        headers: {
          'x-client-id': clientId,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not support this report.');
    }

    setReports((previousReports) =>
      previousReports.map((item, index) =>
        index === reportIndex ? data.report : item
      )
    );

    setSupportCounts((previousCounts) => ({
  ...previousCounts,
  [reportId]: data.report.supportCount ?? 1,
}));
  } catch (error) {
    console.error('Support failed:', error);
    window.alert(error.message);
  }
}


function handleCommentSubmit(reportIndex) {
  const newComment = commentInputs[reportIndex]?.trim()

  if (!newComment) {
    return
  }

  setComments((previousComments) => ({
    ...previousComments,
    [reportIndex]: [
      ...(previousComments[reportIndex] || []),
      newComment,
    ],
  }))

  setCommentInputs((previousInputs) => ({
    ...previousInputs,
    [reportIndex]: '',
  }))
}
  return (
  <div className="app">
    {showLandingPage ? (
      <div className="landing-page">
        <div className="landing-content">
          <p className="landing-kicker">
            A DIGITAL CIVIC PLATFORM FOR TAMIL NADU
          </p>

          <h1>CIVICCONNECT</h1>

          <p className="landing-tagline">
            REPORT. CONNECT. RESOLVE.
          </p>

          <p className="landing-description">
            A community-driven platform to report civic issues,
            discover problems in your area, and stay connected
            with their resolution.
          </p>

          <div className="landing-actions">
            <button
              className="landing-choice"
              onClick={() => {
                setShowLandingPage(false)
                setActivePage('home')
              }}
            >
              <span className="landing-choice-label">
                CITIZEN / PUBLIC
              </span>

              <strong>ENTER CIVIC FEED →</strong>

              <small>
                Explore reports, report civic issues, and support
                problems in your community.
              </small>
            </button>

            <button
              className="landing-choice"
              onClick={() => {
                setShowLandingPage(false)
                setActivePage('admin')
              }}
            >
              <span className="landing-choice-label">
                GOVERNMENT / ADMIN
              </span>

              <strong>OPEN ADMIN DASHBOARD →</strong>

              <small>
                Monitor reported issues, manage cases, and update
                their resolution status.
              </small>
            </button>
          </div>
        </div>
      </div>
    ) : (
      <>
      {/* Top bar */}
      <header className="top-nav">
  <div className="masthead">
    <h1 className="logo">
      Civic<span>Connect</span>
    </h1>

    <p className="masthead-tagline">
      A STRONGER TAMIL NADU
      <br />
      BUILDS ITSELF
    </p>

    <div className="edition-info">
      <p>VOL. 01 | TAMIL NADU</p>
      <p>MONDAY, 21 SEPT 2026</p>
    </div>
  </div>

  <div className="masthead-subtitle">
    <span>PEOPLE</span>
    <span>|</span>
    <span>PROBLEMS</span>
    <span>|</span>
    <span>PROGRESS</span>
  </div>

  <button className="profile-button" aria-label="Profile">
    <UserCircle size={26} strokeWidth={1.8} />
  </button>
</header>
      {/* Main layout */}
      <div className="page-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button
  className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
  onClick={() => setActivePage('home')}
>
  <Home size={23} />
  <span>Home</span>
</button>

            <button
  
className={`nav-item ${activePage === 'search' ? 'active' : ''}`}

  onClick={() => {
  setActivePage('search');
  setTimeout(() => {
    document.querySelector('.newspaper-banner input')?.focus();
  }, 0);
}}
>
  <Search size={23} />
  <span>Search</span>
</button>

            <button
  className={`nav-item ${activePage === 'issues' ? 'active' : ''}`}
  onClick={() => setActivePage('issues')}
>
  <Compass size={23} />
  <span>Issues</span>
</button>

            <button
  className={`nav-item ${activePage === 'report' ? 'active' : ''}`}
  onClick={() => setActivePage('report')}
>
  <PlusSquare size={23} />
  <span>Report</span>
</button>

            <button
  className={`nav-item ${activePage === 'notifications' ? 'active' : ''}`}
  onClick={() => {
  setActivePage('notifications');

  setNotifications((previousNotifications) =>
    previousNotifications.map((notification) => ({
      ...notification,
      read: true,
    }))
  );
}}
>
  <Bell size={23} />

  <span className="notification-nav-label">
    Notifications

    {notifications.filter(
      (notification) => !notification.read
    ).length > 0 && (
      <span className="notification-count">
        {notifications.filter(
          (notification) => !notification.read
        ).length}
      </span>
    )}
  </span>
</button>

            <button
  className={`nav-item ${activePage === 'profile' ? 'active' : ''}`}
  onClick={() => setActivePage('profile')}
>
  <UserCircle size={23} />
  <span>Profile</span>
</button>
          </nav>
        </aside>
        <aside className="left-news-panel">
  <h3>THE DAILY CIVIC</h3>
  <p>Local voices. Local change.</p>

  <div className="news-divider" />

  <h4>SECTIONS</h4>
  <p>Community News</p>
  <p>Trending Issues</p>
  <p>Public Services</p>
  <p>Citizen Voices</p>
</aside>

        {/* Feed */}
        <main className="main-content">
  {activePage === 'home' ? (
    <>
      <div className="newspaper-banner">
  <p className="banner-kicker">THE VOICE OF THE COMMUNITY</p>

  <h2>YOUR CITY. YOUR VOICE.</h2>

  <div className="banner-divider">
    <span></span>
    <strong>REPORT • DISCUSS • TRACK • RESOLVE</strong>
    <span></span>
  </div>

  <p className="banner-description">
    Discover problems, raise awareness, and help build a stronger Tamil Nadu.
  </p>

  <p className="report-count">
    Total reports: {reports.length}
  </p>
  <div className="search-container">
  <Search size={20} />

  <input
    type="text"
    placeholder="Search reports, locations, or categories..."
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
  />

  {searchTerm && (
    <button
      className="clear-search-button"
      onClick={() => setSearchTerm('')}
      aria-label="Clear search"
    >
      ×
    </button>
  )}
</div>
</div>
<div className="latest-reports-heading">
  <h2>
  {selectedCategory
    ? categoryNames[selectedCategory].toUpperCase()
    : 'LATEST REPORTS'}
</h2>
  <span>COMMUNITY EDITION</span>
</div>
{selectedCategory && (
  <div className="active-category-filter">
    <span>
      SHOWING: {categoryNames[selectedCategory].toUpperCase()}
    </span>

    <button
      type="button"
      onClick={() => setSelectedCategory(null)}
    >
      SHOW ALL
    </button>
  </div>
)}
      {reports.length === 0 ? (
  <div className="empty-feed">
    <Compass size={42} strokeWidth={1.5} />
    <h3>Your community starts here</h3>
    <p>Reports from your area will appear here.</p>
  </div>
) : (
  <div className="reports-feed">
    {reports
  .filter((report) => {
    const searchText = searchTerm.toLowerCase();

    const matchesSearch =
      report.title.toLowerCase().includes(searchText) ||
      report.description.toLowerCase().includes(searchText) ||
      report.location.toLowerCase().includes(searchText) ||
      categoryNames[report.category]
        .toLowerCase()
        .includes(searchText);

    const matchesCategory =
      !selectedCategory || report.category === selectedCategory;

    return matchesSearch && matchesCategory;
  })
  .map((report, index) => (
      <div className="report-card" key={index}>
        <div className="report-author">
  <UserCircle size={32} strokeWidth={1.8} />

  <div>
    <strong>{report.authorName || 'Community Member'}</strong>
    <span>Tamil Nadu</span>
  </div>
</div>
        <div className="article-layout">
  <div className="article-text">
    <h3>{report.title}</h3>

<p className="report-date">
  COMMUNITY REPORT • {report.date || 'RECENT'}
</p>

<p>{report.description}</p>

    <p>
      <strong>Category:</strong> {categoryNames[report.category]}
    </p>

    <p>
      <strong>Priority:</strong>{' '}
      <span className={`priority-badge ${report.priority}`}>
        {report.priority.charAt(0).toUpperCase() +
          report.priority.slice(1)}
      </span>
    </p>
    {(report.priority === 'high' || report.priority === 'critical') && (
  <p className="urgent-label">
    ⚠️ URGENT COMMUNITY UPDATE
  </p>
)}

    <p>
      <strong>Location:</strong> {report.location}
    </p>
    <p>
  <strong>Status:</strong>{' '}
  <span className="status-badge">
    {report.status || 'PENDING'}
  </span>
</p>
  </div>

  {report.photo && (
    <img
      className="feed-report-image"
      src={report.photo}
      alt={report.title}
    />
  )}
</div>

        

        
 <div className="report-actions">       
<button
  type="button"
  className={`support-button ${
    supportCounts[report.id] !== undefined ? 'supported' : ''
  }`}
  onClick={() => handleSupport(index)}
  disabled={supportCounts[report.id] !== undefined}
>
  <ThumbsUp size={18} />
  {supportCounts[report.id] !== undefined ? 'Supported' : 'Support'}{' '}
  {report.supportCount ?? 0}
</button>

<button
  type="button"
  className="comment-button"
  onClick={() =>
    setActiveCommentReport(
      activeCommentReport === index ? null : index
    )
  }
>
  <MessageCircle size={18} />
  Comment
</button>

<button
  type="button"
  className="delete-button"
  onClick={async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this report?'
    );

    if (!confirmed) return;

    const reportId = report.id || report._id;

    try {
      const response = await fetch(
        `http://localhost:5000/api/reports/${reportId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete report');
      }

      setReports((previousReports) =>
        previousReports.filter(
          (item) => (item.id || item._id) !== reportId
        )
      );

      alert('Report deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message || 'Could not delete the report.');
    }
  }}
>
  Delete
</button>
</div>

{activeCommentReport === index && (
  <div className="comment-section">
    <input
      type="text"
      placeholder="Add a comment..."
      value={commentInputs[index] || ''}
      onChange={(event) =>
        setCommentInputs((previousInputs) => ({
          ...previousInputs,
          [index]: event.target.value,
        }))
      }
    />

    <button
      type="button"
      onClick={() => handleCommentSubmit(index)}
    >
      Post
    </button>
  </div>
)}
<div className="comments-list">
  
{[
  ...(report.comments || []),
  ...(comments[index] || []),
].map((comment, commentIndex) => (
  <p key={commentIndex} className="comment-item">
    <strong>Community Member:</strong> {comment}
  </p>
))}

</div>
      </div>
    ))}
  </div>
)}
    </>
  ) : activePage === 'report' ? (
    <ReportForm
  onBack={() => setActivePage('home')}
  onSubmitReport={handleReportSubmit}
/>
) : activePage === 'issues' ? (
  <div className="issues-page">
    <div className="page-section-heading">
      <h2>CIVIC ISSUES</h2>
      <span>{Object.keys(categoryNames).length} CATEGORIES</span>
    </div>
    <p className="issues-summary">
  {reports.length} COMMUNITY {reports.length === 1 ? 'REPORT' : 'REPORTS'} ACROSS {Object.keys(categoryNames).length} CIVIC CATEGORIES
</p>

    <div className="issues-grid">
      {Object.entries(categoryNames).map(([key, name]) => {
        const categoryCount = reports.filter(
          (report) => report.category === key
        ).length;

        return (
          <button
            className="issue-category-card"
            key={key}
            onClick={() => {
              setSelectedCategory(key);
              setActivePage('home');
            }}
          >
            <h3>{name}</h3>

<small>
  {categoryDescriptions[key]}
</small>

<span>
  {categoryCount} {categoryCount === 1 ? 'REPORT' : 'REPORTS'}
</span>
          </button>
        );
      })}
    </div>
  </div>
  ) : activePage === 'notifications' ? (
  <div className="notifications-page">
    <div className="page-section-heading">
      <h2>NOTIFICATIONS</h2>
      <span>CIVICCONNECT</span>
    </div>

    {notifications.length === 0 ? (
  <div className="notifications-empty">
    <Bell size={32} />
    <h3>NO NEW NOTIFICATIONS</h3>
    <p>
      Updates about your reports, community activity, and issue resolutions
      will appear here.
    </p>
  </div>
) : (
  <div className="notification-list">
    {notifications.map((notification) => (
      <div className="notification-item" key={notification.id}>
        <Bell size={20} />

        <div>
          <p>{notification.message}</p>
          <span>{notification.date}</span>
        </div>
      </div>
    ))}
  </div>
)}
  </div>
  ) : activePage === 'profile' ? (
  <div className="my-reports-page">
    <div className="profile-header">
  <div className="profile-avatar">
    <UserCircle size={58} />
  </div>

  <div className="profile-info">
    <h2>CITIZEN PROFILE</h2>
    <p>YOUR CIVICCONNECT ACTIVITY</p>
  </div>
</div>
<div className="profile-stats">
  <div>
    <strong>{reports.length}</strong>
    <span>REPORTS</span>
  </div>

  <div>
    <strong>
      {reports.filter((report) => report.status === 'RESOLVED').length}
    </strong>
    <span>RESOLVED</span>
  </div>

  <div>
    <strong>
      {
  reports.filter((report) => report.status !== 'RESOLVED').length
}
    </strong>
    <span>ACTIVE</span>
  </div>
</div>
<div className="profile-section">
  <div className="page-section-heading">
    <h2>MY REPORTS</h2>
    <span>{reports.length} REPORTS</span>
  </div>

  {reports.length === 0 ? (
    <p>YOU HAVE NOT SUBMITTED ANY REPORTS YET.</p>
  ) : (
    <div>
      {reports.map((report, index) => (
        <div key={index}>
          <h3>{report.title}</h3>
          <p>{report.location}</p>
          <span
  className={`profile-status-${(report.status || 'PENDING')
    .toLowerCase()
    .replace(' ', '-')}`}
>
  {report.status || 'PENDING'}
</span>
        </div>
      ))}
    </div>
  )}
</div>
    <div className="page-section-heading">
      <h2>MY REPORTS</h2>
      <span>{reports.length} REPORTS</span>
    </div>

    {reports.length === 0 ? (
      <div className="empty-feed">
        <h3>No reports yet</h3>
        <p>Your submitted civic reports will appear here.</p>
      </div>
    ) : (
      <div className="my-reports-list">
        {reports.map((report, index) => (
          <div className="my-report-item" key={index}>
            <h3>{report.title}</h3>

            <p>{report.description}</p>

            <p>
              <strong>Status:</strong>{' '}
              <span className="status-badge">
                {report.status || 'PENDING'}
              </span>
            </p>

            <p>
              <strong>Location:</strong> {report.location}
            </p>
          </div>
        ))}
      </div>
    )}
    </div>
) : activePage === 'admin' ? (
  <div className="admin-page">

    <div className="page-section-heading">
      <h2>ADMIN DASHBOARD</h2>
      <span>CIVICCONNECT</span>
    </div>

    <div className="admin-welcome">
      <p className="admin-kicker">
        GOVERNMENT / CIVIC ADMINISTRATION
      </p>

      <h1>COMMUNITY ISSUES</h1>

      <p>
        Monitor citizen reports, review civic problems,
        and manage issue resolution.
      </p>
    </div>

    <div className="admin-stats">

      <div className="admin-stat">
        <strong>{reports.length}</strong>
        <span>TOTAL REPORTS</span>
      </div>

      <div className="admin-stat">
        <strong>
          {reports.filter(
            (report) => (report.status || 'PENDING') === 'PENDING'
          ).length}
        </strong>
        <span>PENDING</span>
      </div>

      <div className="admin-stat">
        <strong>
          {reports.filter(
            (report) => report.status === 'IN PROGRESS'
          ).length}
        </strong>
        <span>IN PROGRESS</span>
      </div>

      <div className="admin-stat">
        <strong>
          {reports.filter(
            (report) => report.status === 'RESOLVED'
          ).length}
        </strong>
        <span>RESOLVED</span>
      </div>

    </div>

    <div className="admin-reports">

      <div className="page-section-heading">
        <h2>REPORTED ISSUES</h2>
        <span>{reports.length} REPORTS</span>
      </div>

      {reports.length === 0 ? (

        <div className="empty-feed">
          <h3>NO REPORTS YET</h3>
          <p>
            Citizen reports will appear here when they are submitted.
          </p>
        </div>

      ) : (

        <div className="admin-report-list">

          {reports.map((report, index) => (

            <div
              className="admin-report-card"
              key={index}
            >

              <div className="admin-report-main">

                <p className="admin-report-category">
                  {categoryNames[report.category]}
                </p>

                <h3>{report.title}</h3>

                <p>{report.description}</p>

                <div className="admin-report-meta">

  <span>
    LOCATION: {report.location}
  </span>

  <span>
    PRIORITY: {report.priority}
  </span>

  <label className="admin-status-control">
    STATUS:

    <select
      value={report.status || 'PENDING'}
      onChange={(event) =>
        handleStatusChange(index, event.target.value)
      }
    >
      <option value="PENDING">PENDING</option>
      <option value="IN PROGRESS">IN PROGRESS</option>
      <option value="RESOLVED">RESOLVED</option>
    </select>
  </label>

</div>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  </div>
) : (
  <div className="empty-feed">
    <h3>Coming soon</h3>
    <p>This section is under development.</p>
  </div>
)}
</main>
<aside className="right-news-panel">
  <h3>TOP STORIES</h3>

  <div className="news-divider" />

  <h4>Trending Issues</h4>

<div className="trending-list">
  <p>Roads & Potholes</p>
  <p>Garbage & Sanitation</p>
  <p>Water Supply</p>
  <p>Streetlights</p>
  <p>Drainage & Flooding</p>
</div>

  <div className="news-divider" />

  <h4 className="section-kicker">COMMUNITY PULSE</h4>

<div className="quick-stats">
  <p>
    <strong>{reports.length}</strong>
    <span>Total Reports</span>
  </p>

  <p>
    <strong>
      {Object.values(supportCounts).reduce(
        (total, count) => total + count,
        0
      )}
    </strong>
    <span>Community Supports</span>
  </p>
</div>
</aside>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav">
        <button aria-label="Home">
          <Home size={23} />
        </button>

        <button aria-label="Explore">
          <Search size={23} />
        </button>

        <button aria-label="Report a problem">
          <PlusSquare size={23} />
        </button>

        <button aria-label="Notifications">
          <Bell size={23} />
        </button>

        <button aria-label="Profile">
          <UserCircle size={23} />
        </button>
                  </nav>
        </>
      )}
    </div>
  )
}

export default App
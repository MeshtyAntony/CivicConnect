import { useState } from 'react'

function ReportForm({ onBack, onSubmitReport }) {
  const [submitted, setSubmitted] = useState(false)
  const [title, setTitle] = useState('')
const [description, setDescription] = useState('')
const [location, setLocation] = useState('')
const [gpsCoordinates, setGpsCoordinates] = useState(null)
const [gpsMessage, setGpsMessage] = useState('')
const [photo, setPhoto] = useState(null)
const [category, setCategory] = useState('')
const [priority, setPriority] = useState('')

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
const priorityNames = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

function getGPSLocation() {
  setGpsMessage('Getting your location...')

  if (!navigator.geolocation) {
    setGpsMessage('GPS is not supported by this browser.')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude

      setGpsCoordinates({ latitude, longitude })
      setLocation(`${latitude}, ${longitude}`)
      setGpsMessage('Location detected successfully!')
    },
    () => {
      setGpsMessage(
        'Unable to get location. Allow location access and try again.'
      )
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  )
}


  function handleSubmit(event) {
    event.preventDefault()
    const reportData = {
  title,
  description,
  category,
  priority,
  location,
  photo,
  gpsCoordinates,
}

console.log(reportData)
onSubmitReport?.(reportData)
    setSubmitted(true)
  }

  return (
    <div className="report-form">
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Back to Home
      </button>

      <h2>Report a Civic Issue</h2>

      <p>
        Help improve your community by reporting problems in your area.
      </p>

      {submitted ? (
        <div className="success-message">
  <h3>Report submitted successfully!</h3>

  <p>
    Thank you for helping improve your community.
  </p>

  <div className="submitted-details">
    <h4>Report Summary</h4>

    <p>
      <strong>Issue:</strong> {title}
    </p>

    <p>
  <strong>Category:</strong> {categoryNames[category]}
</p>
<p>
  <strong>Priority:</strong>{' '}
  <span className={`priority-badge ${priority}`}>
    {priorityNames[priority]}
  </span>
</p>

    <p>
      <strong>Description:</strong> {description}
    </p>

    <p>
      <strong>Location:</strong> {location}
    </p>
    {photo && (
  <div className="submitted-photo">
    <p>
      <strong>Photo:</strong>
    </p>

    <img
      src={URL.createObjectURL(photo)}
      alt="Submitted civic issue"
    />
  </div>
)}
  </div>
  <button
  type="button"
  className="new-report-button"
  onClick={() => {
    setTitle('')
    setDescription('')
    setLocation('')
    setCategory('')
    setPriority('')
    setPhoto(null)
    setSubmitted(false)
  }}
>
  Create Another Report
</button>
</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>Issue title</label>
          <input
            type="text"
            placeholder="Example: Broken streetlight"
            value={title}
onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label>Issue description</label>
<textarea
  placeholder="Describe the issue..."
  rows="4"
  value={description}
  onChange={(event) => setDescription(event.target.value)}
  maxLength="500"
  required
></textarea>
<p className="character-counter">
  {description.length}/500 characters
</p>
<label>Issue category</label>

<select
  value={category}
  onChange={(event) => setCategory(event.target.value)}
  required
>
  <option value="" disabled>
    Select a category
  </option>

  <option value="roads">Roads & Potholes</option>
  <option value="streetlights">Streetlights</option>
  <option value="garbage">Garbage & Sanitation</option>
  <option value="water">Water Supply</option>
  <option value="drainage">Drainage & Flooding</option>
  <option value="transport">Public Transport</option>
  <option value="traffic">Traffic & Parking</option>
  <option value="electricity">Electricity</option>
  <option value="safety">Public Safety</option>
  <option value="government">Government Services</option>
  <option value="parks">Parks & Public Spaces</option>
  <option value="other">Other</option>
</select>

   <label>Priority</label>

<select
  value={priority}
  onChange={(event) => setPriority(event.target.value)}
  required
>
  <option value="" disabled>
    Select priority
  </option>

  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
  <option value="critical">Critical</option>
</select> 
<button
  type="button"
  onClick={getGPSLocation}
>
  📍 Use My Current Location
</button>

{gpsMessage && <p>{gpsMessage}</p>}

          <label>Location</label>
<input
  type="text"
  placeholder="Enter the issue location"
  value={location}
  onChange={(event) => setLocation(event.target.value)}
  required
/>
<label>Upload a photo</label>
<input
  type="file"
  accept="image/*"
  onChange={(event) => setPhoto(event.target.files[0])}
/>
{photo && (
  <div className="photo-preview">
    <p>Selected photo:</p>
    <img
      src={URL.createObjectURL(photo)}
      alt="Selected civic issue"
    />
  </div>
)}

          <button type="submit">Submit Report</button>
        </form>
      )}
    </div>
  )
}

export default ReportForm
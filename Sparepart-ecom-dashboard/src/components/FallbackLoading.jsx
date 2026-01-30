const FallbackLoading = () => {
  return (
    <div className="p-4">
      <div className="d-flex flex-wrap gap-3 mb-3">
        <div className="skeleton skeleton-card" style={{ width: 220 }} />
        <div className="skeleton skeleton-card" style={{ width: 220 }} />
        <div className="skeleton skeleton-card" style={{ width: 220 }} />
        <div className="skeleton skeleton-card" style={{ width: 220 }} />
      </div>
      <div className="d-flex gap-3">
        <div className="skeleton" style={{ flex: 3, height: 320, borderRadius: 20 }} />
        <div className="d-flex flex-column gap-3" style={{ flex: 2 }}>
          <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
        </div>
      </div>
    </div>
  )
}
export default FallbackLoading

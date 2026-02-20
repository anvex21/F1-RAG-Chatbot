const LoadingBubble = () => {
  return (
    <div className="loader-wrap" aria-busy aria-label="Thinking…">
      <div className="loader" role="presentation">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

export default LoadingBubble;

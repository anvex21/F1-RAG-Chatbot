import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionsRow = ({ onPromptClick }) => {
  const prompt = [
    "Who is head of racing for Mercedes F1 team?",
    "What is the latest news about Red Bull Racing?",
    "What are the current F1 driver standings?",
    "Who is the current world champion in Formula 1?",
  ];
  return (
    <div className="prompt-suggestion-row">
      {prompt.map((suggestion, index) => (
        <PromptSuggestionButton
          key={`suggestion-${index}`}
          text={suggestion}
          onClick={() => onPromptClick(suggestion)}
        />
      ))}
    </div>
  );
};

export default PromptSuggestionsRow;

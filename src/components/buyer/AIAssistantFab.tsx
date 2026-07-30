import { Link } from "react-router-dom";
import { Bot } from "lucide-react";

const AIAssistantFab = () => (
  <Link
    to="/ai-assistant"
    aria-label="Ask Prop-Connect AI"
    className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
  >
    <Bot className="h-5 w-5" />
    <span className="hidden sm:inline">Ask Prop-Connect AI</span>
  </Link>
);

export default AIAssistantFab;

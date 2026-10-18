import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Plus, Minus } from "lucide-react";

const questions = [
  ["What is PROP-CONNECT?", "PROP-CONNECT is a property marketplace that connects buyers, renters, agents, and sellers, helping them discover properties, arrange inspections, and manage property transactions."],
  ["How does PROP-CONNECT work?", "Search for a property, connect with the agent, book an inspection, and initiate a purchase or rental request. You can follow the transaction process through the platform."],
  ["Are properties and agents verified?", "PROP-CONNECT includes verification and review processes to improve marketplace trust. Users should still carry out appropriate property and legal checks."],
  ["Can I inspect a property before buying or renting?", "Yes. You can request an inspection directly from a property listing, and the agent can confirm or propose another time."],
  ["How do I buy or rent a property?", "Select Buy Now or Rent Now on an eligible listing. The agent reviews your request, and an accepted request can proceed through the transaction process."],
  ["Is PROP-CONNECT free to use?", "Property browsing is intended to be free. Some professional services, including agent membership, may have applicable fees that are shown before purchase."],
];

export default function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowDown") next = (index + 1) % questions.length;
    else if (event.key === "ArrowUp") next = (index - 1 + questions.length) % questions.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = questions.length - 1;
    else return;
    event.preventDefault(); triggers.current[next]?.focus();
  };
  return <section data-home-section="faq" className="home-section home-faq" aria-labelledby={`${id}-heading`}>
    <div className="page-container home-faq-layout"><div className="home-faq-intro"><p className="text-eyebrow">A little more clarity</p><h2 id={`${id}-heading`}>Frequently Asked Questions</h2><p>Everything you need to know about discovering properties, connecting with agents, and managing your property journey.</p></div>
      <div><div className="home-faq-accordion">{questions.map(([question,answer],index) => { const expanded = open === index; return <div className="home-faq-item" data-open={expanded} key={question}><h3><button ref={element => { triggers.current[index] = element; }} id={`${id}-question-${index}`} type="button" aria-expanded={expanded} aria-controls={`${id}-answer-${index}`} onClick={() => setOpen(expanded ? null : index)} onKeyDown={event => onKeyDown(event,index)}><span>{question}</span><span className="home-faq-toggle" aria-hidden="true">{expanded ? <Minus /> : <Plus />}</span></button></h3><div id={`${id}-answer-${index}`} role="region" aria-labelledby={`${id}-question-${index}`} aria-hidden={!expanded} className="home-faq-answer"><div><p>{answer}</p></div></div></div>; })}</div><div className="home-faq-help"><strong>Still have questions?</strong><a href="mailto:propconnect0@gmail.com">Contact support</a></div></div>
    </div>
  </section>;
}

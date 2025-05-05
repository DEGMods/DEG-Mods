import { FAQItem } from '../pages/about'
import '../styles/FAQ.css'

type FAQAccordionProps = {
  id: string
  items: FAQItem[]
}

export const FAQAccordion = ({ id, items }: FAQAccordionProps) => (
  <div className="accordion FAQ_Acco" role="tablist" id={id}>
    {items.map((item, index) => (
      <div className="accordion-item FAQ_AccoItem" key={index}>
        <h2 className="accordion-header FAQ_AccoItemHead" role="tab">
          <button
            className="accordion-button collapsed FAQ_AccoItemHeadBtn"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target={`#${id} .item-${index}`}
            aria-expanded="false"
            aria-controls={`${id} .item-${index}`}
          >
            {item.question}
          </button>
        </h2>
        <div
          className={`accordion-collapse collapse item-${index} FAQ_AccoItemContent`}
          role="tabpanel"
          data-bs-parent={`#${id}`}
        >
          <div className="accordion-body sMFAQI_AccoItemContentBody">
            <p className="FAQ_AccoItemContentText">{item.answer}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
)

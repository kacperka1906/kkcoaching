import { defineCollection, z } from 'astro:content';

// Each service is one markdown file with frontmatter.
// Decap CMS writes to these files directly - no code changes needed to edit copy.
const services = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    order: z.number(), // controls display order on the Services section/page
    minor: z.boolean().default(false), // true = Personalised Training Plan (de-emphasised per brief)
    ctaLabel: z.string(),
    ctaTarget: z.string().default('/contact'),
    image: z.string().default('/images/placeholder.png'),
    imageAlt: z.string(),
    bullets: z.array(z.string())
  })
});

const testimonials = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(), // first name or initial only - brief requires consent for full detail
    ageDisclosed: z.boolean().default(false),
    age: z.number().optional(),
    serviceType: z.string(),
    duration: z.string(),
    startingPoint: z.string(),
    result: z.string(),
    consentOnFile: z.boolean().default(false), // must be true before publishing, per brief section 7
    image: z.string().default('/images/placeholder.png'),
    imageAlt: z.string(),
    featured: z.boolean().default(false) // the featured one shows on Home; brief says Kacper's own story goes first
  })
});

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    order: z.number()
  })
});

export const collections = { services, testimonials, faq };

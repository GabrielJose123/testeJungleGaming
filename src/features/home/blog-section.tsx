import { cn } from "@/lib/utils"
import type { BlogPost } from "@/types/catalog"

/** Figma: "Blog" — "Diário da Cunhagem", 4 cards. Artigos estão fora do escopo da entrega. */
export function BlogSection({ posts, className }: { posts: BlogPost[]; className?: string }) {
  return (
    <section aria-labelledby="blog-title" className={cn("flex flex-col items-center gap-10", className)}>
      <header className="flex w-full flex-col gap-3 text-center">
        <h2 id="blog-title" className="text-heading-lg font-bold text-cream-strong">
          Diário da Cunhagem
        </h2>
        <p className="text-body leading-normal text-sand">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <li key={post.id} className="flex flex-col overflow-hidden rounded-md bg-surface-card">
            <img src={post.image} alt="" width={268} height={195} loading="lazy" className="h-[195px] w-full object-cover" />
            <article className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
              <p className="text-caption font-medium whitespace-pre-wrap text-sand">
                {`${post.date}  |  ${post.readTime}`}
              </p>
              <h3 className="text-body-lg leading-normal font-bold text-cream-strong">{post.title}</h3>
              <p className="text-caption font-medium text-sand">{post.excerpt}</p>
              <span
                aria-disabled="true"
                title="Em breve"
                className="flex cursor-not-allowed items-start gap-1 text-caption text-amber"
              >
                <span className="leading-3.5 font-bold">Ler mais</span>
                <span aria-hidden className="leading-normal">
                  →
                </span>
              </span>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

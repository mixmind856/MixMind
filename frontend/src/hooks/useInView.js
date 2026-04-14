import { useEffect, useRef, useState } from 'react'

export const useInView = (options = {}) => {
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
        // Optionally stop observing after it comes into view once
        if (options.once) {
          observer.unobserve(entry.target)
        }
      } else if (!options.once) {
        setIsInView(false)
      }
    }, {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px'
    })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [options.once, options.threshold, options.rootMargin])

  return [ref, isInView]
}

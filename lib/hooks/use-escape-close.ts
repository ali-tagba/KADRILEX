"use client"

import { useEffect, useRef } from "react"

/**
 * Ferme un dialog/popover quand l'utilisateur appuie sur Escape.
 *
 * Utilise un ref interne pour conserver la dernière référence de `onClose`
 * sans réattacher l'event listener à chaque render — pattern conforme aux
 * règles `react-hooks/refs` et `react-hooks/set-state-in-effect`.
 *
 * Usage :
 *   useEscapeClose(onClose)
 */
export function useEscapeClose(onClose: () => void) {
    const ref = useRef(onClose)
    /* Sync de la ref dans un effet — pas pendant le render (anti-pattern). */
    useEffect(() => {
        ref.current = onClose
    })
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") ref.current()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])
}

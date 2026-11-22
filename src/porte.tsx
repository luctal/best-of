import { useEffect, useState } from 'react'
import { codeRetenu, oublierCode, retenirCode, verifierCode } from './adminApi'
import { MSG_CODE_INCORRECT, traduireErreur } from './erreursLogic'

interface Props {
  surCode: (code: string) => void
}

const champ = 'min-h-11 w-full rounded-lg border border-sage bg-fond px-3 text-base'
const bouton = 'min-h-11 rounded-xl px-5 font-titre font-semibold disabled:opacity-50'

// Saisie du code admin : vérifié par la base, retenu sur l'appareil. Le code n'est écrit dans aucun fichier.
export function Porte({ surCode }: Props) {
  const [verification, setVerification] = useState(() => codeRetenu() !== null)
  const [saisie, setSaisie] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  useEffect(() => {
    const c = codeRetenu()
    if (c === null) return
    verifierCode(c).then(
      (ok) => {
        if (ok) surCode(c)
        else {
          oublierCode()
          setMessage(MSG_CODE_INCORRECT)
        }
        setVerification(false)
      },
      (e) => {
        setMessage(traduireErreur(e))
        setVerification(false)
      },
    )
  }, [surCode])

  async function entrer() {
    setOccupe(true)
    setMessage(null)
    try {
      if (await verifierCode(saisie)) {
        retenirCode(saisie)
        surCode(saisie)
      } else setMessage(MSG_CODE_INCORRECT)
    } catch (e) {
      setMessage(traduireErreur(e))
    } finally {
      setOccupe(false)
    }
  }

  if (verification) return <p>Vérification du code…</p>
  return (
    <section className="space-y-3">
      <h2 className="font-titre text-xl font-extrabold">Mode admin</h2>
      {message && <p className="rounded-lg bg-bordeaux/10 p-3 text-bordeaux" role="alert">{message}</p>}
      <label className="font-semibold" htmlFor="code">Code admin</label>
      <input id="code" type="password" autoComplete="off" className={champ} value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && entrer()} />
      <button type="button" className={`${bouton} w-full bg-vert-sombre text-fond sm:w-auto`} onClick={entrer} disabled={occupe || saisie === ''}>Entrer</button>
    </section>
  )
}

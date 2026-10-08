import { redirect } from 'next/navigation'

// The app opens on Property Finder; other pages are reached from the header menu (AppMenu)
export default function Home() {
  redirect('/finder')
}

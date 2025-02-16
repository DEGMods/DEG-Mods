import { Tabs } from 'components/Tabs'
import { useState } from 'react'
import { FeedTabBlogs } from './FeedTabBlogs'
import { FeedTabMods } from './FeedTabMods'
import { FeedTabPosts } from './FeedTabPosts'
import { FeedFilter } from 'components/Filters/FeedFilter'
import { Outlet, useParams } from 'react-router-dom'

export const FeedPage = () => {
  const { note } = useParams()
  // Open posts tab if note is present
  const [tab, setTab] = useState(note ? 2 : 0)

  return (
    <>
      <Tabs tabs={['Mods', 'Blogs', 'Posts']} tab={tab} setTab={setTab} />

      <FeedFilter tab={tab} />

      {tab === 0 && <FeedTabMods />}
      {tab === 1 && <FeedTabBlogs />}
      {tab === 2 && <FeedTabPosts />}

      <Outlet key={note} />
    </>
  )
}

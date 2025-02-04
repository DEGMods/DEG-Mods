import { Tabs } from 'components/Tabs'
import { useState } from 'react'
import { FeedTabBlogs } from './FeedTabBlogs'
import { FeedTabMods } from './FeedTabMods'
import { FeedTabPosts } from './FeedTabPosts'
import { FeedFilter } from 'components/Filters/FeedFilter'

export const FeedPage = () => {
  const [tab, setTab] = useState(0)

  return (
    <>
      <Tabs tabs={['Mods', 'Blogs', 'Posts']} tab={tab} setTab={setTab} />

      <FeedFilter tab={tab} />

      {tab === 0 && <FeedTabMods />}
      {tab === 1 && <FeedTabBlogs />}
      {tab === 2 && <FeedTabPosts />}
    </>
  )
}

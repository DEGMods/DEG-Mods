import { useDidMount, useNDKContext } from 'hooks'
import { Link } from 'react-router-dom'
import { appRoutes, getProfilePageRoute } from 'routes'
import { filterFromId, NDKEvent } from '@nostr-dev-kit/ndk'
import { useState } from 'react'
import { UserProfile } from 'types'
import { hexToNpub } from 'utils'
import { formatDate } from 'date-fns'
import { CommentContent } from 'components/comment/CommentContent'
import { Dots } from 'components/Spinner'

interface NoteWrapperProps {
  noteEntity: string
}
export const NoteWrapper = ({ noteEntity }: NoteWrapperProps) => {
  const { fetchEvent } = useNDKContext()
  const [note, setNote] = useState<NDKEvent>()
  const [profile, setProfile] = useState<UserProfile>()
  useDidMount(() => {
    const filter = filterFromId(noteEntity)
    fetchEvent(filter).then((ndkEvent) => {
      if (ndkEvent) {
        setNote(ndkEvent)
        ndkEvent.author.fetchProfile().then((res) => setProfile(res))
      }
    })
  })

  const profileRoute = note?.author.nprofile
    ? getProfilePageRoute(note?.author.nprofile)
    : appRoutes.home

  if (!note) return <Dots />

  return (
    <div className='IBMSMSMBSSCL_CommentQP'>
      <div className='IBMSMSMBSSCL_Comment'>
        <div className='IBMSMSMBSSCL_CommentTop'>
          <div className='IBMSMSMBSSCL_CommentTopPPWrapper'>
            <Link
              className='IBMSMSMBSSCL_CommentTopPP'
              to={profileRoute}
              style={{
                background: `url('${
                  profile?.image || ''
                }') center / cover no-repeat`
              }}
            />
          </div>
          <div className='IBMSMSMBSSCL_CommentTopDetailsWrapper'>
            <div className='IBMSMSMBSSCL_CommentTopDetails'>
              <Link className='IBMSMSMBSSCL_CTD_Name' to={profileRoute}>
                {profile?.displayName || profile?.name || ''}{' '}
              </Link>
              <Link className='IBMSMSMBSSCL_CTD_Address' to={profileRoute}>
                {hexToNpub(note.pubkey)}
              </Link>
            </div>
            {note.created_at && (
              <div className='IBMSMSMBSSCL_CommentActionsDetails'>
                <a className='IBMSMSMBSSCL_CADTime'>
                  {formatDate(note.created_at * 1000, 'hh:mm aa')}{' '}
                </a>
                <a className='IBMSMSMBSSCL_CADDate'>
                  {formatDate(note.created_at * 1000, 'dd/MM/yyyy')}
                </a>
              </div>
            )}
          </div>
        </div>
        <div className='IBMSMSMBSSCL_CommentBottom'>
          <CommentContent content={note.content} />
        </div>
      </div>
    </div>
  )
}

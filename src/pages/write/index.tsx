import { useRef, useState } from 'react'
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation
} from 'react-router-dom'
import {
  CheckboxFieldUncontrolled,
  InputFieldUncontrolled,
  InputFieldWithImageUpload
} from '../../components/Inputs'
import { ProfileSection } from '../../components/ProfileSection'
import { useAppSelector } from '../../hooks'
import { BlogFormErrors, BlogPageLoaderResult } from 'types'
import '../../styles/innerPage.css'
import '../../styles/styles.css'
import '../../styles/write.css'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { AlertPopup } from 'components/AlertPopup'
import { Editor, EditorRef } from 'components/Markdown/Editor'
import { InputError } from 'components/Inputs/Error'

export const WritePage = () => {
  const userState = useAppSelector((state) => state.user)
  const data = useLoaderData() as BlogPageLoaderResult
  const formErrors = useActionData() as BlogFormErrors
  const navigation = useNavigation()

  const blog = data?.blog
  const title = data?.blog ? 'Edit blog post' : 'Submit a blog post'
  const [content, setContent] = useState(blog?.content || '')
  const [image, setImage] = useState(blog?.image || '')

  const formRef = useRef<HTMLFormElement>(null)
  const editorRef = useRef<EditorRef>(null)

  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false)
  const handleReset = () => {
    setShowConfirmPopup(true)
  }
  const handleResetConfirm = (confirm: boolean) => {
    setShowConfirmPopup(false)

    // Cancel if not confirmed
    if (!confirm) return

    // Reset featured image
    setImage(blog?.image || '')

    // Reset editor
    if (blog?.content) {
      editorRef.current?.setMarkdown(blog?.content)
    }

    formRef.current?.reset()
  }

  return (
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div className='IBMSecMainGroup IBMSecMainGroupAlt'>
          <div className='IBMSMSplitMain'>
            <div className='IBMSMSplitMainBigSide'>
              <div className='IBMSMTitleMain'>
                <h2 className='IBMSMTitleMainHeading'>{title}</h2>
              </div>
              {navigation.state === 'loading' && (
                <LoadingSpinner desc='Loading..' />
              )}
              {navigation.state === 'submitting' && (
                <LoadingSpinner desc='Publishing blog to relays' />
              )}
              <Form
                ref={formRef}
                className='IBMSMSMBS_Write'
                method={blog ? 'put' : 'post'}
              >
                <InputFieldUncontrolled
                  label='Title'
                  name='title'
                  defaultValue={blog?.title}
                  error={formErrors?.title}
                />
                <div className='inputLabelWrapperMain'>
                  <label className='form-label labelMain'>Content</label>
                  <div className='inputMain'>
                    <Editor
                      ref={editorRef}
                      markdown={content}
                      onChange={(md) => {
                        setContent(md)
                      }}
                    />
                  </div>
                  {typeof formErrors?.content !== 'undefined' && (
                    <InputError message={formErrors?.content} />
                  )}
                  {/* encode to keep the markdown formatting */}
                  <input
                    name='content'
                    hidden
                    value={encodeURIComponent(content)}
                    readOnly
                  />
                </div>
                <InputFieldWithImageUpload
                  label='Featured Image URL'
                  name='image'
                  inputMode='url'
                  value={image}
                  error={formErrors?.image}
                  onInputChange={(_, value) => setImage(value)}
                  placeholder='Image URL'
                />
                <InputFieldUncontrolled
                  label='Summary'
                  name='summary'
                  type='textarea'
                  defaultValue={blog?.summary}
                  error={formErrors?.summary}
                />
                <InputFieldUncontrolled
                  label='Tags'
                  description='Separate each tag with a comma. (Example: tag1, tag2, tag3)'
                  placeholder='Tags'
                  name='tags'
                  defaultValue={blog?.tTags?.join(', ')}
                  error={formErrors?.tags}
                />
                <CheckboxFieldUncontrolled
                  label='This post is not safe for work (NSFW)'
                  name='nsfw'
                  defaultChecked={blog?.nsfw}
                />
                {typeof blog?.dTag !== 'undefined' && (
                  <input name='dTag' hidden value={blog.dTag} readOnly />
                )}
                {typeof blog?.rTag !== 'undefined' && (
                  <input name='rTag' hidden value={blog.rTag} readOnly />
                )}
                {typeof blog?.published_at !== 'undefined' && (
                  <input
                    name='published_at'
                    hidden
                    value={blog.published_at}
                    readOnly
                  />
                )}
                <div className='IBMSMSMBS_WriteAction'>
                  <button
                    className='btn btnMain'
                    type='button'
                    onClick={handleReset}
                    disabled={
                      navigation.state === 'loading' ||
                      navigation.state === 'submitting'
                    }
                  >
                    {blog ? 'Reset' : 'Clear fields'}
                  </button>
                  <button
                    className='btn btnMain'
                    type='submit'
                    disabled={
                      navigation.state === 'loading' ||
                      navigation.state === 'submitting'
                    }
                  >
                    {navigation.state === 'submitting'
                      ? 'Publishing...'
                      : 'Publish'}
                  </button>
                </div>
                {showConfirmPopup && (
                  <AlertPopup
                    handleConfirm={handleResetConfirm}
                    handleClose={() => setShowConfirmPopup(false)}
                    header={'Are you sure?'}
                    label={
                      blog
                        ? `Are you sure you want to clear all changes?`
                        : `Are you sure you want to clear all field data?`
                    }
                  />
                )}
              </Form>
            </div>
            {userState.auth && userState.user?.pubkey && (
              <ProfileSection pubkey={userState.user.pubkey as string} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit
} from 'react-router-dom'
import {
  CheckboxField,
  InputField,
  InputFieldWithImageUpload
} from 'components/Inputs'
import { ProfileSection } from 'components/ProfileSection'
import { useAppSelector, useLocalCache } from 'hooks'
import {
  BlogEventEditForm,
  BlogEventSubmitForm,
  BlogFormErrors,
  BlogPageLoaderResult
} from 'types'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { AlertPopup } from 'components/AlertPopup'
import { Editor, EditorRef } from 'components/Markdown/Editor'
import { InputError } from 'components/Inputs/Error'
import { BLOG_DRAFT_CACHE_KEY, initializeBlogForm } from 'utils'
import 'styles/innerPage.css'
import 'styles/styles.css'
import 'styles/write.css'

export const WritePage = () => {
  const userState = useAppSelector((state) => state.user)
  const data = useLoaderData() as BlogPageLoaderResult

  const formErrors = useActionData() as BlogFormErrors
  const navigation = useNavigation()
  const submit = useSubmit()

  const blog = data?.blog

  // Enable cache for the new blog
  const isEditing = typeof data?.blog !== 'undefined'
  const [cache, setCache, clearCache] =
    useLocalCache<BlogEventSubmitForm>(BLOG_DRAFT_CACHE_KEY)

  const title = isEditing ? 'Edit blog post' : 'Submit a blog post'
  const [formState, setFormState] = useState<
    BlogEventSubmitForm | BlogEventEditForm
  >(isEditing ? initializeBlogForm(blog) : cache ? cache : initializeBlogForm())

  useEffect(() => {
    !isEditing && setCache(formState)
  }, [formState, isEditing, setCache])

  const editorRef = useRef<EditorRef>(null)

  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false)
  const handleReset = useCallback(() => {
    setShowConfirmPopup(true)
  }, [])
  const handleResetConfirm = useCallback(
    (confirm: boolean) => {
      setShowConfirmPopup(false)

      // Cancel if not confirmed
      if (!confirm) return

      const initialState = initializeBlogForm(blog)

      // Reset editor
      editorRef.current?.setMarkdown(initialState.content)
      setFormState(initialState)

      // Clear cache
      !isEditing && clearCache()
    },
    [blog, clearCache, isEditing]
  )

  const handleImageChange = useCallback((_name: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      image: value
    }))
  }, [])

  const handleInputChange = useCallback((name: string, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [name]: value
    }))
  }, [])

  const handleEditorChange = useCallback(
    (md: string) => {
      handleInputChange('content', md)
    },
    [handleInputChange]
  )

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target
      setFormState((prevState) => ({
        ...prevState,
        [name]: checked
      }))
    },
    []
  )

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      submit(JSON.stringify(formState), {
        method: isEditing ? 'put' : 'post',
        encType: 'application/json'
      })
    },
    [formState, isEditing, submit]
  )

  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div className="IBMSecMainGroup IBMSecMainGroupAlt">
          <div className="IBMSMSplitMain">
            <div className="IBMSMSplitMainBigSide">
              <div className="IBMSMTitleMain">
                <h2 className="IBMSMTitleMainHeading">{title}</h2>
              </div>
              {navigation.state === 'loading' && (
                <LoadingSpinner desc="Loading.." />
              )}
              {navigation.state === 'submitting' && (
                <LoadingSpinner desc="Publishing blog to relays" />
              )}
              <form className="IBMSMSMBS_Write" onSubmit={handleFormSubmit}>
                <InputField
                  label="Title"
                  name="title"
                  value={formState.title}
                  error={formErrors?.title}
                  onChange={handleInputChange}
                  placeholder="Blog title"
                />
                <div className="inputLabelWrapperMain">
                  <label className="form-label labelMain">Content</label>
                  <div className="inputMain">
                    <Editor
                      ref={editorRef}
                      markdown={formState.content}
                      onChange={handleEditorChange}
                    />
                  </div>
                  {typeof formErrors?.content !== 'undefined' && (
                    <InputError message={formErrors?.content} />
                  )}
                </div>
                <InputFieldWithImageUpload
                  label="Featured Image URL"
                  name="image"
                  inputMode="url"
                  value={formState.image}
                  error={formErrors?.image}
                  onInputChange={handleImageChange}
                  placeholder="Image URL"
                />
                <InputField
                  label="Summary"
                  name="summary"
                  type="textarea"
                  value={formState.summary}
                  error={formErrors?.summary}
                  onChange={handleInputChange}
                  placeholder={'This is a quick description of my blog'}
                />
                <InputField
                  label="Tags"
                  description="Separate each tag with a comma. (Example: tag1, tag2, tag3)"
                  placeholder="Tags"
                  name="tags"
                  value={formState.tags}
                  error={formErrors?.tags}
                  onChange={handleInputChange}
                />
                <CheckboxField
                  label="This post is not safe for work (NSFW)"
                  name="nsfw"
                  isChecked={formState.nsfw}
                  handleChange={handleCheckboxChange}
                  type="stylized"
                />

                <div className="IBMSMSMBS_WriteAction">
                  <button
                    className="btn btnMain"
                    type="button"
                    onClick={handleReset}
                    disabled={
                      navigation.state === 'loading' ||
                      navigation.state === 'submitting'
                    }
                  >
                    {isEditing ? 'Reset' : 'Clear fields'}
                  </button>
                  <button
                    className="btn btnMain"
                    type="submit"
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
                      isEditing
                        ? `Are you sure you want to clear all changes?`
                        : `Are you sure you want to clear all field data?`
                    }
                  />
                )}
              </form>
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

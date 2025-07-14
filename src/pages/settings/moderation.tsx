import { useModerationSettings } from 'hooks'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { CheckboxField } from 'components/Inputs'

/**
 * Moderation settings page component
 * Provides toggles for enhanced moderation and trust filter options
 */
export const ModerationSetting = () => {
  const {
    enhancedModeration,
    enhancedTrust,
    setEnhancedModeration,
    setEnhancedTrust
  } = useModerationSettings()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)

    // Simulate save operation
    await new Promise((resolve) => setTimeout(resolve, 500))

    toast.success('Moderation settings saved successfully!')
    setIsSaving(false)
  }

  const handleEnhancedModerationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEnhancedModeration(e.target.checked)
  }

  const handleEnhancedTrustChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEnhancedTrust(e.target.checked)
  }

  return (
    <>
      <div className="IBMSMSplitMainFullSideFWMid">
        <div className="IBMSMSplitMainFullSideSec">
          <div className="IBMSMSMBS_Write">
            <div className="inputLabelWrapperMain">
              <div className="labelWrapperMain">
                <p className="labelMain">Enhanced Moderation Filter Options</p>
              </div>
              <p className="labelDescriptionMain">
                When enabled, this gives you access to "Unmoderated Fully"
                filter option that was previously only available to admin/staff
                users. This option allows you to see all content without
                moderation filtering.
              </p>
            </div>
            <CheckboxField
              label="Enable enhanced moderation filter options"
              name="enhancedModeration"
              isChecked={enhancedModeration}
              handleChange={handleEnhancedModerationChange}
              type="stylized"
            />

            <div className="inputLabelWrapperMain">
              <div className="labelWrapperMain">
                <p className="labelMain">Enhanced Trust Filter Options</p>
              </div>
              <p className="labelDescriptionMain">
                When enabled, this gives you access to "Mine Only" and "None"
                trust filter options that were previously only available to
                admin/staff users. These options allow you to filter content
                based on your personal trust network or show all content.
              </p>
            </div>
            <CheckboxField
              label="Enable enhanced trust filter options"
              name="enhancedTrust"
              isChecked={enhancedTrust}
              handleChange={handleEnhancedTrustChange}
              type="stylized"
            />

            <div className="IBMSMSMBS_WriteAction">
              <button
                className="btn btnMain"
                type="button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

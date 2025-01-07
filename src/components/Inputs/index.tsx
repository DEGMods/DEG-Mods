import React, { useCallback } from 'react'
import { InputError } from './Error'
import { ImageUpload } from './ImageUpload'
import '../../styles/styles.css'

interface InputFieldProps {
  label: string | React.ReactElement
  description?: string
  type?: 'text' | 'textarea'
  placeholder: string
  name: string
  inputMode?: 'url'
  value: string
  error?: string
  onChange: (name: string, value: string) => void
}

export const InputField = React.memo(
  ({
    label,
    description,
    type = 'text',
    placeholder,
    name,
    inputMode,
    value,
    error,
    onChange
  }: InputFieldProps) => {
    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      onChange(name, e.target.value)
    }

    return (
      <div className='inputLabelWrapperMain'>
        <label className='form-label labelMain'>{label}</label>
        {description && <p className='labelDescriptionMain'>{description}</p>}
        {type === 'textarea' ? (
          <textarea
            className='inputMain'
            placeholder={placeholder}
            name={name}
            value={value}
            onChange={handleChange}
          ></textarea>
        ) : (
          <input
            type={type}
            className='inputMain'
            placeholder={placeholder}
            name={name}
            inputMode={inputMode}
            value={value}
            onChange={handleChange}
          />
        )}
        {error && <InputError message={error} />}
      </div>
    )
  }
)

interface CheckboxFieldProps {
  label: string
  name: string
  isChecked: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: 'default' | 'stylized'
}

export const CheckboxField = React.memo(
  ({
    label,
    name,
    isChecked,
    handleChange,
    type = 'default'
  }: CheckboxFieldProps) => (
    <div
      className={`inputLabelWrapperMain inputLabelWrapperMainAlt${
        type === 'stylized' ? ` inputLabelWrapperMainAltStylized` : ''
      }`}
    >
      <label htmlFor={name} className='form-label labelMain'>
        {label}
      </label>
      <input
        id={name}
        type='checkbox'
        className='CheckboxMain'
        name={name}
        checked={isChecked}
        onChange={handleChange}
      />
    </div>
  )
)

interface InputFieldUncontrolledProps extends React.ComponentProps<'input'> {
  label: string | React.ReactElement
  description?: string
  error?: string
}
/**
 * Uncontrolled input component with design classes, label, description and error support
 *
 * Extends {@link React.ComponentProps<'input'> React.ComponentProps<'input'>}
 * @param label
 * @param description
 * @param error
 *
 * @see {@link React.ComponentProps<'input'>}
 */
export const InputFieldUncontrolled = ({
  label,
  description,
  error,
  ...rest
}: InputFieldUncontrolledProps) => (
  <div className='inputLabelWrapperMain'>
    <label htmlFor={rest.id} className='form-label labelMain'>
      {label}
    </label>
    {description && <p className='labelDescriptionMain'>{description}</p>}
    <input className='inputMain' {...rest} />
    {error && <InputError message={error} />}
  </div>
)

interface CheckboxFieldUncontrolledProps extends React.ComponentProps<'input'> {
  label: string
}

export const CheckboxFieldUncontrolled = ({
  label,
  ...rest
}: CheckboxFieldUncontrolledProps) => (
  <div className='inputLabelWrapperMain inputLabelWrapperMainAlt inputLabelWrapperMainAltStylized'>
    <label htmlFor={rest.id} className='form-label labelMain'>
      {label}
    </label>
    <input type='checkbox' className='CheckboxMain' {...rest} />
  </div>
)

interface InputFieldWithImageUploadProps {
  label: string | React.ReactElement
  description?: string
  placeholder: string
  name: string
  inputMode?: 'url'
  value: string
  error?: string
  onInputChange: (name: string, value: string) => void
}

export const InputFieldWithImageUpload = React.memo(
  ({
    label,
    description,
    placeholder,
    name,
    inputMode,
    value,
    error,
    onInputChange
  }: InputFieldWithImageUploadProps) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onInputChange(name, e.currentTarget.value)
      },
      [name, onInputChange]
    )

    const handleFileChange = useCallback(
      (values: string[]) => {
        onInputChange(name, values[0])
      },
      [name, onInputChange]
    )

    return (
      <div className='inputLabelWrapperMain'>
        <label className='form-label labelMain'>{label}</label>
        {typeof description !== 'undefined' && (
          <p className='labelDescriptionMain'>{description}</p>
        )}

        <ImageUpload onChange={handleFileChange} />

        <input
          type='text'
          className='inputMain'
          placeholder={placeholder}
          name={name}
          inputMode={inputMode}
          value={value}
          onChange={handleChange}
        />
        {error && <InputError message={error} />}
      </div>
    )
  }
)

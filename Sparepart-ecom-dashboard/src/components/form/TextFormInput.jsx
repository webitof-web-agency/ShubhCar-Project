import { FormControl, FormGroup, FormLabel } from 'react-bootstrap'
import Feedback from 'react-bootstrap/esm/Feedback'
import { Controller } from 'react-hook-form'
const TextFormInput = ({
  name,
  containerClassName: containerClass,
  control,
  id,
  label,
  labelRight,
  floatingLabel,
  noValidate,
  labelClassName: labelClass,
  ...other
}) => {
  return (
    <Controller
      name={name}
      defaultValue={''}
      control={control}
      render={({ field, fieldState }) => (
        <FormGroup className={containerClass}>
          {label &&
            (typeof label === 'string' ? (
              <FormLabel htmlFor={id ?? name} className={labelClass}>
                {label}
              </FormLabel>
            ) : (
              <>{label}</>
            ))}
          {labelRight && <span className="auth-floating__label-right">{labelRight}</span>}
          <FormControl id={id ?? name} {...other} {...field} placeholder={floatingLabel ? ' ' : other.placeholder} isInvalid={Boolean(fieldState.error?.message)} />
          {!noValidate && fieldState.error?.message && <Feedback type="invalid">{fieldState.error?.message}</Feedback>}
        </FormGroup>
      )}
    />
  )
}
export default TextFormInput

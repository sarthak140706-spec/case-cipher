import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel';
}

interface SelectFieldProps extends BaseFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function InputField({ label, error, required, className, ...props }: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          "input-forensic w-full",
          error && "border-destructive focus:ring-destructive",
          className
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SelectField({ label, error, required, options, className, ...props }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <select
        {...props}
        className={cn(
          "input-forensic w-full",
          error && "border-destructive focus:ring-destructive",
          className
        )}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function TextareaField({ label, error, required, className, ...props }: TextareaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <textarea
        {...props}
        className={cn(
          "input-forensic w-full min-h-[100px] resize-y",
          error && "border-destructive focus:ring-destructive",
          className
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
